<?php

namespace App\Modules\TelegramBot\Services;

use App\Enums\SatApplicationStatus;
use App\Models\SatApplication;
use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Enums\ConversationState;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Support\TelegramSiteUrl;
use App\Services\AdminTelegramLogService;

class TelegramSatFlowService
{
    public function __construct(
        private readonly ConversationService $conversations,
        private readonly TelegramBotClientFactory $clients,
        private readonly MainMenuKeyboard $mainMenu,
        private readonly AdminTelegramLogService $adminTelegram,
        private readonly TelegramUserDestinationsService $userDestinations,
    ) {}

    public function open(TelegramBot $bot, TelegramAccount $account, int $chatId): void
    {
        $client = $this->clients->forBot($bot);
        $satUrl = TelegramSiteUrl::satPage();
        $identityUrl = TelegramSiteUrl::identityPage();

        if (! $account->user_id || ! $account->hasVerifiedMobile()) {
            $client->sendMessage(
                $chatId,
                'برای ثبت درخواست سات ابتدا ثبت‌نام و تأیید موبایل را کامل کنید (/start).',
                TelegramSiteUrl::linkMarkup($satUrl, '🌐 صفحه سات'),
            );

            return;
        }

        $app = SatApplication::query()
            ->where('user_id', $account->user_id)
            ->latest('id')
            ->first();

        if ($app !== null) {
            $this->sendExistingStatus($bot, $client, $chatId, $app, $account, $satUrl, $identityUrl);

            return;
        }

        $conversation = $this->conversations->forAccount($account);
        $knownName = $this->resolveRegisteredName($account);

        if ($knownName !== null) {
            $this->conversations->transition($conversation, ConversationState::FillingSatApplication, [
                'sat' => ['step' => 'city', 'draft' => ['name' => $knownName]],
            ]);
            $client->sendMessage(
                $chatId,
                "☎️ درخواست همکاری سات\n\n"
                ."نام ثبت‌شده: {$knownName}\n\n"
                ."۱) شهر محل سکونت را بفرستید:\n"
                ."(یا /null اگر نمی‌خواهید)\n"
                .'(برای انصراف «لغو»)',
                ['reply_markup' => $this->mainMenu->replyMarkup($account, $bot)],
            );

            return;
        }

        $this->conversations->transition($conversation, ConversationState::FillingSatApplication, [
            'sat' => ['step' => 'name', 'draft' => []],
        ]);

        $client->sendMessage(
            $chatId,
            "☎️ درخواست همکاری سات\n\n"
            ."فرم را مثل پنل سایت تکمیل کنید.\n\n"
            ."۱) نام و نام خانوادگی را بفرستید:\n"
            .'(یا «لغو»)',
            ['reply_markup' => $this->mainMenu->replyMarkup($account, $bot)],
        );
    }

    private function resolveRegisteredName(TelegramAccount $account): ?string
    {
        $account->loadMissing('user');

        $candidates = [
            trim((string) ($account->display_name ?? '')),
            trim((string) ($account->user?->name ?? '')),
            trim(((string) ($account->first_name ?? '')).' '.((string) ($account->last_name ?? ''))),
        ];

        foreach ($candidates as $name) {
            if (mb_strlen($name) >= 3 && mb_strlen($name) <= 255) {
                return $name;
            }
        }

        return null;
    }

    public function handleText(
        TelegramBot $bot,
        TelegramAccount $account,
        int $chatId,
        string $text,
    ): bool {
        $conversation = $this->conversations->forAccount($account);
        if ($conversation->state !== ConversationState::FillingSatApplication) {
            return false;
        }

        $client = $this->clients->forBot($bot);
        $step = (string) data_get($conversation->context, 'sat.step', 'name');
        $draft = (array) data_get($conversation->context, 'sat.draft', []);

        if (in_array(trim($text), ['لغو', '/cancel'], true)) {
            $this->conversations->transition($conversation, ConversationState::Idle, ['sat' => null]);
            $client->sendMessage($chatId, 'ثبت درخواست سات لغو شد.', [
                'reply_markup' => $this->mainMenu->replyMarkup($account, $bot),
            ]);

            return true;
        }

        if ($this->mainMenu->isMenuButton($text, $account, $bot)) {
            $this->conversations->transition($conversation, ConversationState::Idle, ['sat' => null]);

            return false;
        }

        match ($step) {
            'name' => $this->onName($conversation, $client, $chatId, $text, $draft),
            'city' => $this->onCity($conversation, $client, $chatId, $text, $draft),
            'age' => $this->onAge($bot, $account, $conversation, $client, $chatId, $text, $draft),
            default => $this->conversations->transition($conversation, ConversationState::Idle, ['sat' => null]),
        };

        return true;
    }

    /** @param  array<string, mixed>  $draft */
    private function onName($conversation, $client, int $chatId, string $text, array $draft): void
    {
        $name = trim($text);
        if (mb_strlen($name) < 3 || mb_strlen($name) > 255) {
            $client->sendMessage($chatId, 'نام معتبر بفرستید (حداقل ۳ کاراکتر):');

            return;
        }

        $draft['name'] = $name;
        $this->conversations->transition($conversation, ConversationState::FillingSatApplication, [
            'sat' => ['step' => 'city', 'draft' => $draft],
        ]);
        $client->sendMessage($chatId, "شهر محل سکونت را بفرستید:\n(یا /null اگر نمی‌خواهید)");
    }

    /** @param  array<string, mixed>  $draft */
    private function onCity($conversation, $client, int $chatId, string $text, array $draft): void
    {
        $city = trim($text);
        if (in_array(strtolower($city), ['/null', 'null', '-'], true)) {
            $draft['city'] = null;
        } else {
            if (mb_strlen($city) > 120) {
                $client->sendMessage($chatId, 'نام شهر حداکثر ۱۲۰ کاراکتر باشد:');

                return;
            }
            $draft['city'] = $city;
        }

        $this->conversations->transition($conversation, ConversationState::FillingSatApplication, [
            'sat' => ['step' => 'age', 'draft' => $draft],
        ]);
        $client->sendMessage($chatId, "سن خود را با عدد انگلیسی بفرستید (۱۰ تا ۱۲۰):\n(یا /null)");
    }

    /** @param  array<string, mixed>  $draft */
    private function onAge(
        TelegramBot $bot,
        TelegramAccount $account,
        $conversation,
        $client,
        int $chatId,
        string $text,
        array $draft,
    ): void {
        $raw = trim($text);
        $age = null;
        if (! in_array(strtolower($raw), ['/null', 'null', '-'], true)) {
            if (! preg_match('/^\d{1,3}$/', $raw)) {
                $client->sendMessage($chatId, 'سن را با عدد انگلیسی بفرستید یا /null:');

                return;
            }
            $age = (int) $raw;
            if ($age < 10 || $age > 120) {
                $client->sendMessage($chatId, 'سن باید بین ۱۰ تا ۱۲۰ باشد:');

                return;
            }
        }

        if (! $account->user_id) {
            $this->conversations->transition($conversation, ConversationState::Idle, ['sat' => null]);
            $client->sendMessage($chatId, 'حساب شما به سایت متصل نیست. دوباره /start کنید.');

            return;
        }

        if (SatApplication::query()->where('user_id', $account->user_id)->exists()) {
            $this->conversations->transition($conversation, ConversationState::Idle, ['sat' => null]);
            $client->sendMessage($chatId, 'شما قبلاً درخواست سات ثبت کرده‌اید.');

            return;
        }

        $application = SatApplication::query()->create([
            'user_id' => $account->user_id,
            'name' => (string) ($draft['name'] ?? $account->display_name ?? 'کاربر'),
            'mobile' => $account->mobile,
            'city' => $draft['city'] ?? null,
            'age' => $age,
            'status' => SatApplicationStatus::Received,
            'submitted_at' => now(),
        ]);

        $this->adminTelegram->notifySatApplicationSubmitted($application->loadMissing('user'));

        $this->conversations->transition($conversation, ConversationState::Idle, ['sat' => null]);

        $client->sendMessage(
            $chatId,
            "✅ درخواست سات ثبت شد.\n"
            ."وضعیت: دریافت شد\n\n"
            .'نتیجه بررسی در پنل سایت و همین ربات قابل مشاهده است.',
            TelegramSiteUrl::linkMarkup(
                TelegramSiteUrl::satPage(),
                '🌐 مشاهده در پنل سات',
                [[['text' => 'منوی اصلی', 'callback_data' => 'menu:home']]],
            ),
        );
        $client->sendMessage($chatId, 'منوی اصلی:', [
            'reply_markup' => $this->mainMenu->replyMarkup($account, $bot),
        ]);
    }

    private function sendExistingStatus(
        TelegramBot $bot,
        $client,
        int $chatId,
        SatApplication $app,
        TelegramAccount $account,
        ?string $satUrl,
        ?string $identityUrl,
    ): void {
        $status = $app->status instanceof SatApplicationStatus
            ? $app->status
            : SatApplicationStatus::tryFrom((string) $app->status);

        $label = match ($status) {
            SatApplicationStatus::Received => 'دریافت شد',
            SatApplicationStatus::Reviewing => 'در حال بررسی',
            SatApplicationStatus::Accepted => 'پذیرفته شد',
            SatApplicationStatus::Rejected => 'رد شده',
            default => 'نامشخص',
        };

        $account->loadMissing('user.identityProfile', 'user.satMembership');
        $verificationLevel = (int) ($account->user?->identityProfile?->verification_level ?? 0);
        $acceptedButLocked = $status === SatApplicationStatus::Accepted && $verificationLevel < 2;
        $membershipActive = (bool) $account->user?->satMembership?->isActive();

        $text = "☎️ وضعیت درخواست سات\n\n"
            ."وضعیت: {$label}\n"
            .'نام ثبت‌شده: '.($app->name ?: '—')."\n"
            .'شهر: '.($app->city ?: '—')."\n"
            .'سن: '.($app->age ?: '—');

        if ($acceptedButLocked) {
            $text .= "\n\n✅ پذیرفته شده‌اید، اما دسترسی هنوز قفل است.\n"
                .'برای احراز هویت سطح ۲ وارد پنل دانشجو شوید.';
        } elseif ($membershipActive) {
            $text .= "\n\n✅ دسترسی سات شما فعال است.";
            $satSection = $this->userDestinations->formatSatSection($bot, $account);
            if ($satSection !== null) {
                $text .= "\n\n".$satSection;
            }
        }

        $extra = [];
        if ($acceptedButLocked) {
            foreach (TelegramSiteUrl::urlKeyboardRow('🔐 احراز هویت سطح ۲', $identityUrl) as $row) {
                $extra[] = $row;
            }
        }
        if ($membershipActive) {
            foreach ($this->userDestinations->satKeyboardRows($bot, $account) as $row) {
                $extra[] = $row;
            }
        }
        foreach (TelegramSiteUrl::urlKeyboardRow('🌐 پنل سات', $satUrl) as $row) {
            $extra[] = $row;
        }

        $options = $extra !== [] ? ['reply_markup' => ['inline_keyboard' => $extra]] : [];
        if ($membershipActive && str_contains($text, '<b>')) {
            $options['parse_mode'] = 'HTML';
        }

        $client->sendMessage($chatId, $text, $options);
    }
}
