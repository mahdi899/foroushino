<?php

declare(strict_types=1);

namespace TelegramHost\Services;

use TelegramHost\Account\AccountCache;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Conversation\ConversationRepository;
use TelegramHost\Http\ResilientLiveClient;
use TelegramHost\Support\InlineButtons;
use TelegramHost\Support\TelegramCustomEmoji;
use TelegramHost\Telegram\BotApiClient;

/**
 * SAT open + multi-step form on the foreign host.
 * Only the final submit hits Iran (live/sat/submit) — and only when SAT is enabled locally.
 */
final class HostSatFlow
{
    /** @var list<string> */
    private const CANCEL = ['لغو', '/cancel', 'انصراف', 'cancel'];

    public function __construct(
        private readonly BotApiClient $api,
        private readonly SyncCache $cache,
        private readonly AccountCache $accounts,
        private readonly ConversationRepository $conversations,
        private readonly ResilientLiveClient $live,
        private readonly MainMenu $mainMenu,
        private readonly string $siteBaseUrl,
    ) {}

    public function open(int $chatId, int $telegramUserId): void
    {
        if (! $this->isSatEnabled()) {
            $this->replySatDisabled($chatId, $telegramUserId);

            return;
        }

        $sat = $this->accounts->satSnapshot($telegramUserId);
        $satUrl = $this->cache->siteUrl('sat', $this->siteBaseUrl.'/sat');

        if (is_array($sat) && ! empty($sat['has_application'])) {
            $text = (string) ($sat['text'] ?? 'وضعیت درخواست سات شما در دسترس است.');
            $options = [
                'parse_mode' => 'HTML',
                'reply_markup' => [
                    'inline_keyboard' => [
                        [InlineButtons::url('مشاهده در پنل سات', $satUrl, 'bell', 'primary')],
                    ],
                ],
            ];
            $this->api->sendMessage($chatId, $text, $options);

            return;
        }

        $row = $this->accounts->get($telegramUserId);
        $knownName = trim((string) ($row['display_name'] ?? ''));
        if (mb_strlen($knownName) >= 3) {
            $this->conversations->set($telegramUserId, 'filling_sat_application', [
                'sat' => ['step' => 'city', 'draft' => ['name' => $knownName]],
            ]);
            $this->api->sendMessage(
                $chatId,
                "☎️ درخواست همکاری سات\n\nنام ثبت‌شده: {$knownName}\n\n"
                ."۱) شهر محل سکونت را بفرستید:\n(یا /null اگر نمی‌خواهید)",
                [
                    'reply_markup' => [
                        'inline_keyboard' => [[InlineButtons::callback('لغو', 'sat:cancel', 'cross', 'danger')]],
                    ],
                ],
            );

            return;
        }

        $this->conversations->set($telegramUserId, 'filling_sat_application', [
            'sat' => ['step' => 'name', 'draft' => []],
        ]);
        $this->api->sendMessage(
            $chatId,
            "☎️ درخواست همکاری سات\n\nفرم را تکمیل کنید.\n\n۱) نام و نام خانوادگی را بفرستید:",
            [
                'reply_markup' => [
                    'inline_keyboard' => [[InlineButtons::callback('لغو', 'sat:cancel', 'cross', 'danger')]],
                ],
            ],
        );
    }

    public function cancel(int $chatId, int $telegramUserId): void
    {
        $this->conversations->set($telegramUserId, 'idle', []);
        $this->api->sendMessage($chatId, 'ثبت درخواست سات لغو شد.', [
            'reply_markup' => $this->mainMenu->replyMarkup($telegramUserId),
        ]);
    }

    /** @return bool true if handled */
    public function handleText(int $chatId, int $telegramUserId, string $text): bool
    {
        $conversation = $this->conversations->get($telegramUserId);
        if ($conversation['state'] !== 'filling_sat_application') {
            return false;
        }

        if (! $this->isSatEnabled()) {
            $this->replySatDisabled($chatId, $telegramUserId);

            return true;
        }

        if (in_array(trim($text), self::CANCEL, true)) {
            $this->cancel($chatId, $telegramUserId);

            return true;
        }

        if ($this->mainMenu->isMenuButton($text)) {
            $this->conversations->set($telegramUserId, 'idle', []);

            return false;
        }

        $step = (string) ($conversation['context']['sat']['step'] ?? 'name');
        $draft = (array) ($conversation['context']['sat']['draft'] ?? []);

        return match ($step) {
            'name' => $this->onName($chatId, $telegramUserId, $text, $draft),
            'city' => $this->onCity($chatId, $telegramUserId, $text, $draft),
            'age' => $this->onAge($chatId, $telegramUserId, $text, $draft),
            default => $this->resetIdle($telegramUserId),
        };
    }

    /** @param array<string, mixed> $draft */
    private function onName(int $chatId, int $telegramUserId, string $text, array $draft): bool
    {
        if (! $this->isSatEnabled()) {
            $this->replySatDisabled($chatId, $telegramUserId);

            return true;
        }

        $name = trim($text);
        if (mb_strlen($name) < 3 || mb_strlen($name) > 255) {
            $this->api->sendMessage($chatId, 'نام معتبر بفرستید (حداقل ۳ کاراکتر):');

            return true;
        }
        $draft['name'] = $name;
        $this->conversations->set($telegramUserId, 'filling_sat_application', [
            'sat' => ['step' => 'city', 'draft' => $draft],
        ]);
        $this->api->sendMessage($chatId, "شهر محل سکونت را بفرستید:\n(یا /null اگر نمی‌خواهید)");

        return true;
    }

    /** @param array<string, mixed> $draft */
    private function onCity(int $chatId, int $telegramUserId, string $text, array $draft): bool
    {
        if (! $this->isSatEnabled()) {
            $this->replySatDisabled($chatId, $telegramUserId);

            return true;
        }

        $city = trim($text);
        if (in_array(strtolower($city), ['/null', 'null', '-'], true)) {
            $draft['city'] = null;
        } else {
            if (mb_strlen($city) > 120) {
                $this->api->sendMessage($chatId, 'نام شهر حداکثر ۱۲۰ کاراکتر باشد:');

                return true;
            }
            $draft['city'] = $city;
        }
        $this->conversations->set($telegramUserId, 'filling_sat_application', [
            'sat' => ['step' => 'age', 'draft' => $draft],
        ]);
        $this->api->sendMessage($chatId, "سن خود را با عدد انگلیسی بفرستید (۱۰ تا ۱۲۰):\n(یا /null)");

        return true;
    }

    /** @param array<string, mixed> $draft */
    private function onAge(int $chatId, int $telegramUserId, string $text, array $draft): bool
    {
        if (! $this->isSatEnabled()) {
            $this->replySatDisabled($chatId, $telegramUserId);

            return true;
        }

        $raw = trim($text);
        $age = null;
        if (! in_array(strtolower($raw), ['/null', 'null', '-'], true)) {
            if (! preg_match('/^\d{1,3}$/', $raw)) {
                $this->api->sendMessage($chatId, 'سن را با عدد انگلیسی بفرستید یا /null:');

                return true;
            }
            $age = (int) $raw;
            if ($age < 10 || $age > 120) {
                $this->api->sendMessage($chatId, 'سن باید بین ۱۰ تا ۱۲۰ باشد:');

                return true;
            }
        }

        $result = $this->live->satSubmit($chatId, $telegramUserId, [
            'name' => (string) ($draft['name'] ?? ''),
            'city' => $draft['city'] ?? null,
            'age' => $age,
        ]);

        if (! empty($result['offline'])) {
            $this->conversations->set($telegramUserId, 'filling_sat_application', [
                'sat' => ['step' => 'age', 'draft' => $draft],
            ]);
            $url = $this->cache->siteUrl('sat', $this->siteBaseUrl.'/sat');
            $this->api->sendMessage($chatId, $this->cache->message(
                'sat_use_site',
                'اتصال به سرور برقرار نشد. لطفاً دوباره سن را بفرستید یا از لینک زیر استفاده کنید:',
            ), [
                'reply_markup' => ['inline_keyboard' => [[InlineButtons::url('ثبت‌نام سات', $url, 'bell', 'primary')]]],
            ]);

            return true;
        }

        if (empty($result['ok'])) {
            $message = (string) ($result['message'] ?? 'ثبت درخواست سات ناموفق بود.');
            $this->conversations->set($telegramUserId, 'idle', []);
            $this->api->sendMessage(
                $chatId,
                $message,
                ['reply_markup' => $this->mainMenu->replyMarkup($telegramUserId)],
            );

            return true;
        }

        $this->conversations->set($telegramUserId, 'idle', []);

        $satUrl = $this->cache->siteUrl('sat', $this->siteBaseUrl.'/sat');
        $this->api->sendMessage(
            $chatId,
            TelegramCustomEmoji::tag('check')." درخواست سات ثبت شد.\nوضعیت: دریافت شد\n\n"
            .'نتیجه بررسی در پنل سایت و همین ربات قابل مشاهده است.',
            [
                'reply_markup' => [
                    'inline_keyboard' => [[InlineButtons::url('مشاهده در پنل سات', $satUrl, 'bell', 'primary')]],
                ],
            ],
        );
        $this->api->sendMessage($chatId, 'منوی اصلی:', [
            'reply_markup' => $this->mainMenu->replyMarkup($telegramUserId),
        ]);

        return true;
    }

    private function isSatEnabled(): bool
    {
        $explicit = trim($this->cache->message('__sat_enabled', ''));
        if ($explicit === '0') {
            return false;
        }
        if ($explicit === '1') {
            return true;
        }

        return $this->cache->featureEnabled('sat_enabled');
    }

    private function replySatDisabled(int $chatId, int $telegramUserId): void
    {
        $this->conversations->set($telegramUserId, 'idle', []);
        $this->api->sendMessage(
            $chatId,
            $this->cache->message(
                'sat_disabled',
                'کالسنتر سات به زودی فعال می‌شود',
            ),
            ['reply_markup' => $this->mainMenu->replyMarkup($telegramUserId)],
        );
    }

    private function resetIdle(int $telegramUserId): bool
    {
        $this->conversations->set($telegramUserId, 'idle', []);

        return true;
    }
}
