<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Contracts\TelegramBotClientInterface;
use App\Modules\TelegramBot\Enums\ConversationState;
use App\Modules\TelegramBot\Enums\UpdateStatus;
use App\Modules\TelegramBot\Jobs\ProcessTelegramUpdateJob;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramBroadcast;
use App\Modules\TelegramBot\Models\TelegramBroadcastRecipient;
use App\Modules\TelegramBot\Models\TelegramConversation;
use App\Modules\TelegramBot\Models\TelegramDestination;
use App\Modules\TelegramBot\Models\TelegramRequiredChat;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use App\Modules\TelegramBot\Repositories\TelegramUpdateRepository;
use App\Modules\TelegramBot\Support\TelegramSiteUrl;
use RuntimeException;
use Throwable;

class BotAdminPanelService
{
    private const USERS_PER_PAGE = 8;

    private const BROADCASTS_PER_PAGE = 6;

    private const DESTINATIONS_PER_PAGE = 6;

    public function __construct(
        private readonly TelegramBotClientFactory $clients,
        private readonly ConversationService $conversations,
        private readonly HealthCheckService $health,
        private readonly BroadcastDispatchService $broadcastDispatch,
        private readonly TelegramUpdateRepository $updates,
    ) {}

    public function openDashboard(TelegramBot $bot, TelegramAccount $account, int $chatId): void
    {
        if (! $this->ensureAdmin($bot, $account, $chatId)) {
            return;
        }

        $conversation = $this->conversations->forAccount($account);
        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);

        $client = $this->clients->forBot($bot);
        $client->sendMessage($chatId, $this->dashboardText($bot), [
            'reply_markup' => $this->mainInlineMenu(),
        ]);
    }

    public function handleCallback(
        TelegramBot $bot,
        TelegramAccount $account,
        string $data,
        int $chatId,
        int $messageId,
        string $callbackId,
    ): bool {
        if (! str_starts_with($data, 'admin:')) {
            return false;
        }

        $client = $this->clients->forBot($bot);

        if ($data === 'admin:x') {
            $this->exitAdmin($account, $chatId, $client, $messageId);
            $this->answer($client, $callbackId, 'خارج شدید.');

            return true;
        }

        if (! $account->isBotAdmin()) {
            $this->answer($client, $callbackId, 'دسترسی ادمین ندارید.', true);

            return true;
        }

        try {
            match (true) {
                $data === 'admin:h' => $this->showHome($bot, $account, $client, $chatId, $messageId),
                str_starts_with($data, 'admin:u:') => $this->handleUsersCallback($bot, $account, $client, $chatId, $messageId, $data),
                str_starts_with($data, 'admin:b:') => $this->handleBroadcastsCallback($bot, $account, $client, $chatId, $messageId, $data),
                str_starts_with($data, 'admin:rc:') => $this->handleRequiredChatsCallback($bot, $account, $client, $chatId, $messageId, $data),
                str_starts_with($data, 'admin:d:') => $this->handleDestinationsCallback($bot, $account, $client, $chatId, $messageId, $data),
                str_starts_with($data, 'admin:p') => $this->handleProfileCallback($bot, $account, $client, $chatId, $messageId, $data),
                str_starts_with($data, 'admin:s') => $this->handleSettingsCallback($bot, $account, $client, $chatId, $messageId, $data),
                str_starts_with($data, 'admin:l') => $this->handleLogsCallback($bot, $account, $client, $chatId, $messageId, $data),
                default => $this->showHome($bot, $account, $client, $chatId, $messageId),
            };
            $this->answer($client, $callbackId);
        } catch (Throwable $e) {
            $this->answer($client, $callbackId, mb_substr($e->getMessage(), 0, 180), true);
        }

        return true;
    }

    /** @param  array<string, mixed>  $message */
    public function handleTextInput(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        int $chatId,
        string $text,
    ): bool {
        if (! $account->isBotAdmin()) {
            return false;
        }

        if ($conversation->state === ConversationState::AdminPanel && in_array($text, ['❌ خروج از پنل ادمین', 'لغو', '/cancel'], true)) {
            $this->conversations->reset($conversation);
            $client = $this->clients->forBot($bot);
            $client->sendMessage($chatId, 'به منوی اصلی برگشتید.', [
                'reply_markup' => app(MainMenuKeyboard::class)->replyMarkup($account),
            ]);

            return true;
        }

        if ($conversation->state !== ConversationState::AdminWaitingInput) {
            return false;
        }

        $admin = (array) ($conversation->context['admin'] ?? []);
        $flow = (string) ($admin['flow'] ?? '');
        $client = $this->clients->forBot($bot);

        if ($text === '/cancel' || $text === 'لغو') {
            $this->conversations->transition($conversation, ConversationState::AdminPanel, [
                'admin' => ['flow' => null, 'draft' => []],
            ]);
            $client->sendMessage($chatId, 'لغو شد.', ['reply_markup' => $this->backHomeMarkup()]);

            return true;
        }

        try {
            match ($flow) {
                'broadcast_title' => $this->onBroadcastTitle($bot, $account, $conversation, $client, $chatId, $text),
                'broadcast_text' => $this->onBroadcastText($bot, $account, $conversation, $client, $chatId, $text),
                'broadcast_quick' => $this->onBroadcastQuick($bot, $account, $conversation, $client, $chatId, $text),
                'profile_name' => $this->onProfileName($bot, $account, $conversation, $client, $chatId, $text),
                'profile_short' => $this->onProfileShort($bot, $account, $conversation, $client, $chatId, $text),
                'profile_desc' => $this->onProfileDescription($bot, $account, $conversation, $client, $chatId, $text),
                default => throw new RuntimeException('مرحله نامعتبر. «لغو» بزنید و دوباره شروع کنید.'),
            };
        } catch (Throwable $e) {
            $client->sendMessage($chatId, 'خطا: '.$e->getMessage(), [
                'reply_markup' => $this->backHomeMarkup(),
            ]);
        }

        return true;
    }

    /** @param  array<string, mixed>  $message */
    public function handlePhotoInput(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        int $chatId,
        array $message,
    ): bool {
        if (! $account->isBotAdmin() || $conversation->state !== ConversationState::AdminWaitingInput) {
            return false;
        }

        $admin = (array) ($conversation->context['admin'] ?? []);
        if (($admin['flow'] ?? '') !== 'profile_photo') {
            return false;
        }

        $photos = $message['photo'] ?? [];
        if (! is_array($photos) || $photos === []) {
            return false;
        }

        $largest = $photos[array_key_last($photos)] ?? null;
        $fileId = is_array($largest) ? ($largest['file_id'] ?? null) : null;
        if (! is_string($fileId) || $fileId === '') {
            return false;
        }

        $client = $this->clients->forBot($bot);
        $jpgPath = null;

        try {
            $file = $client->getFile($fileId);
            $filePath = $file['file_path'] ?? null;
            if (! is_string($filePath) || $filePath === '') {
                throw new RuntimeException('دریافت فایل از تلگرام ناموفق بود.');
            }

            $bytes = $client->downloadFile($filePath);
            $tmp = tempnam(sys_get_temp_dir(), 'tg_admin_avatar_');
            if ($tmp === false) {
                throw new RuntimeException('ایجاد فایل موقت ناموفق بود.');
            }

            file_put_contents($tmp, $bytes);
            $jpgPath = $this->materializeStaticProfileJpeg($tmp);
            $client->setMyProfilePhoto($jpgPath);

            $this->conversations->transition($conversation, ConversationState::AdminPanel, [
                'admin' => ['flow' => null, 'draft' => []],
            ]);

            $client->sendMessage($chatId, '✅ عکس پروفایل بات به‌روز شد.', [
                'reply_markup' => $this->backHomeMarkup(),
            ]);
        } catch (Throwable $e) {
            $client->sendMessage($chatId, 'آپلود عکس ناموفق بود: '.$e->getMessage(), [
                'reply_markup' => $this->backHomeMarkup(),
            ]);
        } finally {
            if (is_string($jpgPath) && is_file($jpgPath)) {
                @unlink($jpgPath);
            }
            if (isset($tmp) && is_string($tmp) && is_file($tmp)) {
                @unlink($tmp);
            }
        }

        return true;
    }

    private function ensureAdmin(TelegramBot $bot, TelegramAccount $account, int $chatId): bool
    {
        if ($account->isBotAdmin()) {
            return true;
        }

        $client = $this->clients->forBot($bot);
        $client->sendMessage($chatId, 'دسترسی ادمین بات برای شما فعال نیست.', [
            'reply_markup' => app(MainMenuKeyboard::class)->replyMarkup($account),
        ]);

        return false;
    }

    private function dashboardText(TelegramBot $bot): string
    {
        $total = TelegramAccount::query()->where('telegram_bot_id', $bot->id)->count();
        $linked = TelegramAccount::query()->where('telegram_bot_id', $bot->id)->whereNotNull('user_id')->count();
        $blocked = TelegramAccount::query()->where('telegram_bot_id', $bot->id)->where('is_blocked', true)->count();
        $admins = TelegramAccount::query()->where('telegram_bot_id', $bot->id)->where('is_bot_admin', true)->count();
        $draftBroadcasts = TelegramBroadcast::query()->where('telegram_bot_id', $bot->id)->where('status', 'draft')->count();
        $requiredChats = TelegramRequiredChat::query()->where('telegram_bot_id', $bot->id)->where('is_active', true)->count();

        return "🛠 پنل ادمین بات\n\n"
            ."ربات: {$bot->display_name} ({$bot->key})\n"
            ."مخاطبان: {$total} · متصل: {$linked} · مسدود: {$blocked}\n"
            ."ادمین‌های بات: {$admins}\n"
            ."پیام همگانی پیش‌نویس: {$draftBroadcasts}\n"
            ."کانال اجباری فعال: {$requiredChats}\n\n"
            ."از دکمه‌های زیر برای مدیریت استفاده کنید.\n"
            .'برای لغو هر مرحله «لغو» بنویسید.';
    }

    /** @return array<string, mixed> */
    private function mainInlineMenu(): array
    {
        return [
            'inline_keyboard' => [
                [
                    ['text' => '👥 کاربران', 'callback_data' => 'admin:u:p:0'],
                    ['text' => '📣 پیام همگانی', 'callback_data' => 'admin:b:p:0'],
                ],
                [
                    ['text' => '📻 کانال اجباری', 'callback_data' => 'admin:rc:p:0'],
                    ['text' => '📍 مقاصد', 'callback_data' => 'admin:d:p:0'],
                ],
                [
                    ['text' => '🤖 پروفایل بات', 'callback_data' => 'admin:p'],
                    ['text' => '⚙️ تنظیمات', 'callback_data' => 'admin:s'],
                ],
                [
                    ['text' => '📋 لاگ‌ها', 'callback_data' => 'admin:l'],
                ],
                [
                    ['text' => '🏠 داشبورد', 'callback_data' => 'admin:h'],
                    ['text' => '❌ خروج', 'callback_data' => 'admin:x'],
                ],
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function backHomeMarkup(): array
    {
        return [
            'inline_keyboard' => [
                [
                    ['text' => '🏠 داشبورد', 'callback_data' => 'admin:h'],
                    ['text' => '❌ خروج', 'callback_data' => 'admin:x'],
                ],
            ],
        ];
    }

    private function showHome(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
    ): void {
        $conversation = $this->conversations->forAccount($account);
        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);

        $text = $this->dashboardText($bot);
        $markup = ['inline_keyboard' => $this->mainInlineMenu()['inline_keyboard']];

        if ($messageId > 0) {
            $client->editMessageText($text, [
                'chat_id' => $chatId,
                'message_id' => $messageId,
                'reply_markup' => $markup,
            ]);

            return;
        }

        $client->sendMessage($chatId, $text, ['reply_markup' => $markup]);
    }

    private function exitAdmin(
        TelegramAccount $account,
        int $chatId,
        TelegramBotClientInterface $client,
        int $messageId,
    ): void {
        $conversation = $this->conversations->forAccount($account);
        $this->conversations->reset($conversation);

        if ($messageId > 0) {
            $client->editMessageText('به منوی اصلی برگشتید.', [
                'chat_id' => $chatId,
                'message_id' => $messageId,
            ]);
        }

        $client->sendMessage($chatId, 'منوی اصلی:', [
            'reply_markup' => app(MainMenuKeyboard::class)->replyMarkup($account),
        ]);
    }

    private function handleUsersCallback(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        string $data,
    ): void {
        $parts = explode(':', $data);
        $action = $parts[2] ?? 'p';

        if ($action === 'p') {
            $page = max(0, (int) ($parts[3] ?? 0));
            $this->renderUsersList($bot, $client, $chatId, $messageId, $page);

            return;
        }

        $userId = (int) ($parts[3] ?? 0);
        $target = TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->whereKey($userId)
            ->first();

        if ($target === null) {
            throw new RuntimeException('کاربر یافت نشد.');
        }

        if ($action === 'i') {
            $this->renderUserDetail($client, $chatId, $messageId, $target);

            return;
        }

        if ($action === 'b') {
            $target->update(['is_blocked' => ! $target->is_blocked]);
            $this->renderUserDetail($client, $chatId, $messageId, $target->fresh());

            return;
        }

        if ($action === 'a') {
            $target->update(['is_bot_admin' => ! $target->is_bot_admin]);
            $this->renderUserDetail($client, $chatId, $messageId, $target->fresh());
        }
    }

    private function renderUsersList(
        TelegramBot $bot,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        int $page,
    ): void {
        $query = TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->orderByDesc('id');

        $total = (clone $query)->count();
        $accounts = $query->offset($page * self::USERS_PER_PAGE)->limit(self::USERS_PER_PAGE)->get();

        $lines = ["👥 کاربران (صفحه ".($page + 1).')', ''];
        $keyboard = [];

        foreach ($accounts as $item) {
            $label = $this->accountLabel($item);
            $lines[] = "#{$item->id} · {$label}";
            $keyboard[] = [['text' => $label, 'callback_data' => 'admin:u:i:'.$item->id]];
        }

        if ($accounts->isEmpty()) {
            $lines[] = 'کاربری یافت نشد.';
        }

        $nav = [];
        if ($page > 0) {
            $nav[] = ['text' => '◀️ قبلی', 'callback_data' => 'admin:u:p:'.($page - 1)];
        }
        if (($page + 1) * self::USERS_PER_PAGE < $total) {
            $nav[] = ['text' => 'بعدی ▶️', 'callback_data' => 'admin:u:p:'.($page + 1)];
        }
        if ($nav !== []) {
            $keyboard[] = $nav;
        }

        $keyboard[] = [
            ['text' => '🏠 داشبورد', 'callback_data' => 'admin:h'],
            ['text' => '❌ خروج', 'callback_data' => 'admin:x'],
        ];

        $this->editOrSend($client, $chatId, $messageId, implode("\n", $lines), ['inline_keyboard' => $keyboard]);
    }

    private function renderUserDetail(
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        TelegramAccount $target,
    ): void {
        $name = $target->display_name ?: trim(($target->first_name ?? '').' '.($target->last_name ?? '')) ?: '—';
        $username = $target->telegram_username ? '@'.$target->telegram_username : '—';
        $mobile = $target->mobile ? preg_replace('/^(\d{4})\d+(\d{4})$/', '$1***$2', $target->mobile) : '—';

        $text = "👤 کاربر #{$target->id}\n"
            ."نام: {$name}\n"
            ."تلگرام: {$username}\n"
            ."TG ID: {$target->telegram_user_id}\n"
            ."موبایل: {$mobile}\n"
            .'متصل به سایت: '.($target->user_id ? 'بله' : 'خیر')."\n"
            .'مسدود: '.($target->is_blocked ? 'بله' : 'خیر')."\n"
            .'ادمین بات: '.($target->is_bot_admin ? 'بله' : 'خیر');

        $keyboard = [
            [
                ['text' => $target->is_blocked ? '✅ رفع مسدودیت' : '🚫 مسدود', 'callback_data' => 'admin:u:b:'.$target->id],
                ['text' => $target->is_bot_admin ? '⬇️ حذف ادمین' : '⬆️ ادمین بات', 'callback_data' => 'admin:u:a:'.$target->id],
            ],
            [
                ['text' => '◀️ لیست', 'callback_data' => 'admin:u:p:0'],
                ['text' => '🏠 داشبورد', 'callback_data' => 'admin:h'],
            ],
        ];

        $this->editOrSend($client, $chatId, $messageId, $text, ['inline_keyboard' => $keyboard]);
    }

    private function handleBroadcastsCallback(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        string $data,
    ): void {
        $parts = explode(':', $data);
        $action = $parts[2] ?? 'p';

        if ($action === 'p') {
            $page = max(0, (int) ($parts[3] ?? 0));
            $this->renderBroadcastsList($bot, $client, $chatId, $messageId, $page);

            return;
        }

        if ($action === 'n') {
            $conversation = $this->conversations->forAccount($account);
            $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
                'admin' => ['flow' => 'broadcast_title', 'draft' => []],
            ]);
            $client->sendMessage($chatId, "📝 پیام همگانی با عنوان\n\nعنوان را بنویسید (یا «لغو»):");

            return;
        }

        if ($action === 'q') {
            $conversation = $this->conversations->forAccount($account);
            $audience = $this->activeAudienceCount($bot);
            $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
                'admin' => ['flow' => 'broadcast_quick', 'draft' => []],
            ]);
            $client->sendMessage(
                $chatId,
                "✉️ ارسال پیام همگانی\n\n"
                ."متن پیام را همین‌جا بنویسید تا برای {$audience} مخاطب فعال ارسال شود.\n"
                ."بعد از نوشتن، پیش‌نمایش و دکمه «ارسال» می‌آید.\n\n"
                .'(یا «لغو»)',
            );

            return;
        }

        $broadcastId = (int) ($parts[3] ?? 0);
        $broadcast = TelegramBroadcast::query()
            ->where('telegram_bot_id', $bot->id)
            ->whereKey($broadcastId)
            ->first();

        if ($broadcast === null) {
            throw new RuntimeException('پیام همگانی یافت نشد.');
        }

        match ($action) {
            'i' => $this->renderBroadcastDetail($client, $chatId, $messageId, $broadcast, $bot),
            'ok' => $this->approveBroadcast($bot, $client, $chatId, $messageId, $broadcast, $account),
            'sn' => $this->sendBroadcastNow($bot, $client, $chatId, $messageId, $broadcast, $account),
            'st' => $this->stopBroadcast($client, $chatId, $messageId, $broadcast, $bot),
            'ts' => $this->testBroadcast($client, $chatId, $messageId, $broadcast, $account, $bot),
            default => $this->renderBroadcastsList($bot, $client, $chatId, $messageId, 0),
        };
    }

    private function renderBroadcastsList(
        TelegramBot $bot,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        int $page,
    ): void {
        $query = TelegramBroadcast::query()
            ->where('telegram_bot_id', $bot->id)
            ->orderByDesc('id');

        $total = (clone $query)->count();
        $items = $query->offset($page * self::BROADCASTS_PER_PAGE)->limit(self::BROADCASTS_PER_PAGE)->get();

        $lines = ["📣 پیام‌های همگانی (صفحه ".($page + 1).')', ''];
        $lines[] = '✉️ «ارسال سریع»: فقط متن بنویسید و ارسال کنید.';
        $lines[] = '';
        $keyboard = [
            [['text' => '✉️ ارسال پیام همگانی', 'callback_data' => 'admin:b:q']],
            [['text' => '📝 پیام با عنوان جدا', 'callback_data' => 'admin:b:n']],
        ];

        foreach ($items as $item) {
            $status = $this->broadcastStatusLabel((string) $item->status);
            $label = mb_substr("#{$item->id} · {$item->title} ({$status})", 0, 40);
            $lines[] = $label;
            $keyboard[] = [['text' => $label, 'callback_data' => 'admin:b:i:'.$item->id]];
        }

        if ($items->isEmpty()) {
            $lines[] = 'پیامی ثبت نشده.';
        }

        $nav = [];
        if ($page > 0) {
            $nav[] = ['text' => '◀️', 'callback_data' => 'admin:b:p:'.($page - 1)];
        }
        if (($page + 1) * self::BROADCASTS_PER_PAGE < $total) {
            $nav[] = ['text' => '▶️', 'callback_data' => 'admin:b:p:'.($page + 1)];
        }
        if ($nav !== []) {
            $keyboard[] = $nav;
        }

        $keyboard[] = [
            ['text' => '🏠 داشبورد', 'callback_data' => 'admin:h'],
        ];

        $this->editOrSend($client, $chatId, $messageId, implode("\n", $lines), ['inline_keyboard' => $keyboard]);
    }

    private function renderBroadcastDetail(
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        TelegramBroadcast $broadcast,
        ?TelegramBot $bot = null,
        ?string $notice = null,
    ): void {
        $stats = TelegramBroadcastRecipient::query()
            ->where('telegram_broadcast_id', $broadcast->id)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $audienceEstimate = $bot ? $this->activeAudienceCount($bot) : null;

        $text = ($notice ? $notice."\n\n" : '')
            ."📣 #{$broadcast->id} · {$broadcast->title}\n"
            .'وضعیت: '.$this->broadcastStatusLabel((string) $broadcast->status)."\n"
            .'مخاطب: '.($broadcast->audience_count ?: ($audienceEstimate ?? '—'))."\n"
            ."ارسال‌شده: ".($stats['sent'] ?? 0)."\n"
            ."ناموفق: ".($stats['failed'] ?? 0)."\n\n"
            .mb_substr((string) data_get($broadcast->content, 'text', ''), 0, 500);

        $keyboard = [];
        $status = (string) $broadcast->status;

        if (in_array($status, ['draft', 'approved', 'scheduled'], true)) {
            $row = [];
            if ($status === 'draft') {
                $row[] = ['text' => '✅ تأیید', 'callback_data' => 'admin:b:ok:'.$broadcast->id];
            }
            $row[] = ['text' => '🚀 ارسال به همه', 'callback_data' => 'admin:b:sn:'.$broadcast->id];
            $row[] = ['text' => '🧪 تست', 'callback_data' => 'admin:b:ts:'.$broadcast->id];
            $keyboard[] = $row;
        }

        if (in_array($status, ['queued', 'sending'], true)) {
            $keyboard[] = [['text' => '⏹ توقف', 'callback_data' => 'admin:b:st:'.$broadcast->id]];
        }

        $keyboard[] = [
            ['text' => '◀️ لیست', 'callback_data' => 'admin:b:p:0'],
            ['text' => '🏠 داشبورد', 'callback_data' => 'admin:h'],
        ];

        $this->editOrSend($client, $chatId, $messageId, $text, ['inline_keyboard' => $keyboard]);
    }

    private function onBroadcastTitle(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
    ): void {
        $title = trim($text);
        if ($title === '') {
            throw new RuntimeException('عنوان خالی است.');
        }

        $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
            'admin' => [
                'flow' => 'broadcast_text',
                'draft' => ['title' => mb_substr($title, 0, 255)],
            ],
        ]);

        $client->sendMessage($chatId, 'متن پیام همگانی را بنویسید (حداکثر ۴۰۰۰ کاراکتر):');
    }

    private function onBroadcastText(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
    ): void {
        $admin = (array) ($conversation->context['admin'] ?? []);
        $draft = (array) ($admin['draft'] ?? []);
        $title = (string) ($draft['title'] ?? '');

        if ($title === '') {
            throw new RuntimeException('عنوان پیام یافت نشد. دوباره شروع کنید.');
        }

        $body = trim($text);
        if ($body === '') {
            throw new RuntimeException('متن پیام خالی است.');
        }

        $broadcast = TelegramBroadcast::query()->create([
            'telegram_bot_id' => $bot->id,
            'title' => $title,
            'status' => 'draft',
            'content' => ['text' => mb_substr($body, 0, 4000), 'options' => []],
            'created_by' => $account->user_id,
        ]);

        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);

        $this->sendBroadcastPreview($bot, $client, $chatId, $broadcast, '✅ پیش‌نویس ذخیره شد.');
    }

    private function onBroadcastQuick(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
    ): void {
        $body = trim($text);
        if ($body === '') {
            throw new RuntimeException('متن پیام خالی است.');
        }

        $title = 'پیام '.now()->format('Y-m-d H:i');

        $broadcast = TelegramBroadcast::query()->create([
            'telegram_bot_id' => $bot->id,
            'title' => $title,
            'status' => 'draft',
            'content' => ['text' => mb_substr($body, 0, 4000), 'options' => []],
            'created_by' => $account->user_id,
        ]);

        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);

        $this->sendBroadcastPreview($bot, $client, $chatId, $broadcast);
    }

    private function sendBroadcastPreview(
        TelegramBot $bot,
        TelegramBotClientInterface $client,
        int $chatId,
        TelegramBroadcast $broadcast,
        ?string $prefix = null,
    ): void {
        $audience = $this->activeAudienceCount($bot);
        $body = (string) data_get($broadcast->content, 'text', '');

        $message = ($prefix ? $prefix."\n\n" : '')
            ."📣 پیش‌نمایش #{$broadcast->id}\n"
            ."مخاطبان فعال: {$audience}\n\n"
            .mb_substr($body, 0, 3500);

        $client->sendMessage($chatId, $message, [
            'reply_markup' => [
                'inline_keyboard' => [
                    [
                        ['text' => '🚀 ارسال به همه', 'callback_data' => 'admin:b:sn:'.$broadcast->id],
                        ['text' => '🧪 تست برای من', 'callback_data' => 'admin:b:ts:'.$broadcast->id],
                    ],
                    [
                        ['text' => '📋 جزئیات', 'callback_data' => 'admin:b:i:'.$broadcast->id],
                        ['text' => '🏠 داشبورد', 'callback_data' => 'admin:h'],
                    ],
                ],
            ],
        ]);
    }

    private function approveBroadcast(
        TelegramBot $bot,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        TelegramBroadcast $broadcast,
        TelegramAccount $account,
    ): void {
        if ($broadcast->status !== 'draft') {
            throw new RuntimeException('فقط پیش‌نویس قابل تأیید است.');
        }

        $broadcast->update([
            'status' => 'approved',
            'approved_by' => $account->user_id,
        ]);

        $this->renderBroadcastDetail($client, $chatId, $messageId, $broadcast->fresh(), $bot, '✅ پیام تأیید شد.');
    }

    private function sendBroadcastNow(
        TelegramBot $bot,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        TelegramBroadcast $broadcast,
        TelegramAccount $account,
    ): void {
        $status = (string) $broadcast->status;

        if (! in_array($status, ['draft', 'approved', 'scheduled'], true)) {
            throw new RuntimeException('این پیام در وضعیت فعلی قابل ارسال نیست.');
        }

        $audience = $this->activeAudienceCount($bot);
        if ($audience === 0) {
            throw new RuntimeException('هیچ مخاطب فعالی برای ارسال وجود ندارد.');
        }

        if ($status === 'draft') {
            $broadcast->update([
                'status' => 'approved',
                'approved_by' => $account->user_id,
            ]);
            $broadcast->refresh();
        }

        $this->broadcastDispatch->queue($broadcast->fresh());
        $sent = $broadcast->fresh();

        $notice = "✅ ارسال شروع شد.\nمخاطبان: {$sent->audience_count}";

        if ($messageId > 0) {
            $this->renderBroadcastDetail($client, $chatId, $messageId, $sent, $bot, $notice);
        }

        $client->sendMessage(
            $chatId,
            $notice."\n\nپیام #{$sent->id} در صف ارسال قرار گرفت. وضعیت را از «جزئیات» ببینید.",
            [
                'reply_markup' => [
                    'inline_keyboard' => [
                        [['text' => '📋 وضعیت ارسال', 'callback_data' => 'admin:b:i:'.$sent->id]],
                        [['text' => '🏠 داشبورد', 'callback_data' => 'admin:h']],
                    ],
                ],
            ],
        );
    }

    private function stopBroadcast(
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        TelegramBroadcast $broadcast,
        TelegramBot $bot,
    ): void {
        $broadcast->update([
            'status' => 'stopped',
            'stopped_at' => now(),
        ]);

        $this->renderBroadcastDetail($client, $chatId, $messageId, $broadcast->fresh(), $bot, '⏹ ارسال متوقف شد.');
    }

    private function testBroadcast(
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        TelegramBroadcast $broadcast,
        TelegramAccount $account,
        TelegramBot $bot,
    ): void {
        $text = (string) ($broadcast->content['text'] ?? '');
        $options = (array) ($broadcast->content['options'] ?? []);
        $client->sendMessage(
            $account->telegram_user_id,
            "🧪 تست پیام همگانی #{$broadcast->id}\n\n".$text,
            $options,
        );
        $this->renderBroadcastDetail($client, $chatId, $messageId, $broadcast, $bot, '🧪 نسخه تست برای شما ارسال شد.');
    }

    private function activeAudienceCount(TelegramBot $bot): int
    {
        return TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('is_blocked', false)
            ->count();
    }

    private function handleRequiredChatsCallback(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        string $data,
    ): void {
        $parts = explode(':', $data);
        $action = $parts[2] ?? 'p';

        if ($action === 'p') {
            $this->renderRequiredChatsList($bot, $client, $chatId, $messageId);

            return;
        }

        $chatRowId = (int) ($parts[3] ?? 0);
        $requiredChat = TelegramRequiredChat::query()
            ->where('telegram_bot_id', $bot->id)
            ->whereKey($chatRowId)
            ->first();

        if ($requiredChat === null) {
            throw new RuntimeException('کانال یافت نشد.');
        }

        if ($action === 't') {
            $requiredChat->update(['is_active' => ! $requiredChat->is_active]);
        }

        if ($action === 'r') {
            $requiredChat->update(['is_required' => ! $requiredChat->is_required]);
        }

        $this->renderRequiredChatDetail($client, $chatId, $messageId, $requiredChat->fresh());
    }

    private function renderRequiredChatsList(
        TelegramBot $bot,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
    ): void {
        $items = TelegramRequiredChat::query()
            ->where('telegram_bot_id', $bot->id)
            ->orderBy('sort_order')
            ->get();

        $lines = ['📻 کانال‌های اجباری', ''];
        $keyboard = [];

        foreach ($items as $item) {
            $flag = ($item->is_active ? '✅' : '⛔').($item->is_required ? ' *' : '');
            $label = mb_substr("{$flag} {$item->title}", 0, 40);
            $lines[] = "#{$item->id} · {$item->title}";
            $keyboard[] = [['text' => $label, 'callback_data' => 'admin:rc:i:'.$item->id]];
        }

        if ($items->isEmpty()) {
            $lines[] = 'کانالی ثبت نشده.';
        }

        $keyboard[] = [['text' => '🏠 داشبورد', 'callback_data' => 'admin:h']];

        $this->editOrSend($client, $chatId, $messageId, implode("\n", $lines), ['inline_keyboard' => $keyboard]);
    }

    private function renderRequiredChatDetail(
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        TelegramRequiredChat $requiredChat,
    ): void {
        $text = "📻 #{$requiredChat->id} · {$requiredChat->title}\n"
            ."chat_id: {$requiredChat->chat_id}\n"
            .'فعال: '.($requiredChat->is_active ? 'بله' : 'خیر')."\n"
            .'اجباری: '.($requiredChat->is_required ? 'بله' : 'خیر')."\n"
            .($requiredChat->invite_link ? "لینک: {$requiredChat->invite_link}" : '');

        $keyboard = [
            [
                ['text' => $requiredChat->is_active ? '⛔ غیرفعال' : '✅ فعال', 'callback_data' => 'admin:rc:t:'.$requiredChat->id],
                ['text' => $requiredChat->is_required ? 'اختیاری' : 'اجباری', 'callback_data' => 'admin:rc:r:'.$requiredChat->id],
            ],
            [
                ['text' => '◀️ لیست', 'callback_data' => 'admin:rc:p:0'],
                ['text' => '🏠 داشبورد', 'callback_data' => 'admin:h'],
            ],
        ];

        $this->editOrSend($client, $chatId, $messageId, $text, ['inline_keyboard' => $keyboard]);
    }

    private function handleDestinationsCallback(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        string $data,
    ): void {
        $parts = explode(':', $data);
        $action = $parts[2] ?? 'p';

        if ($action === 'p') {
            $page = max(0, (int) ($parts[3] ?? 0));
            $this->renderDestinationsList($bot, $client, $chatId, $messageId, $page);

            return;
        }

        $destinationId = (int) ($parts[3] ?? 0);
        $destination = TelegramDestination::query()
            ->where('telegram_bot_id', $bot->id)
            ->whereKey($destinationId)
            ->first();

        if ($destination === null) {
            throw new RuntimeException('مقصد یافت نشد.');
        }

        if ($action === 't') {
            $destination->update(['is_active' => ! $destination->is_active]);
        }

        $this->renderDestinationDetail($client, $chatId, $messageId, $destination->fresh());
    }

    private function renderDestinationsList(
        TelegramBot $bot,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        int $page,
    ): void {
        $query = TelegramDestination::query()
            ->where('telegram_bot_id', $bot->id)
            ->orderByDesc('id');

        $total = (clone $query)->count();
        $items = $query->offset($page * self::DESTINATIONS_PER_PAGE)->limit(self::DESTINATIONS_PER_PAGE)->get();

        $lines = ["📍 مقاصد (صفحه ".($page + 1).')', ''];
        $keyboard = [];

        foreach ($items as $item) {
            $flag = $item->is_active ? '✅' : '⛔';
            $label = mb_substr("{$flag} {$item->title}", 0, 40);
            $lines[] = "#{$item->id} · {$item->title}";
            $keyboard[] = [['text' => $label, 'callback_data' => 'admin:d:i:'.$item->id]];
        }

        if ($items->isEmpty()) {
            $lines[] = 'مقصدی ثبت نشده.';
        }

        $nav = [];
        if ($page > 0) {
            $nav[] = ['text' => '◀️', 'callback_data' => 'admin:d:p:'.($page - 1)];
        }
        if (($page + 1) * self::DESTINATIONS_PER_PAGE < $total) {
            $nav[] = ['text' => '▶️', 'callback_data' => 'admin:d:p:'.($page + 1)];
        }
        if ($nav !== []) {
            $keyboard[] = $nav;
        }

        $keyboard[] = [['text' => '🏠 داشبورد', 'callback_data' => 'admin:h']];

        $this->editOrSend($client, $chatId, $messageId, implode("\n", $lines), ['inline_keyboard' => $keyboard]);
    }

    private function renderDestinationDetail(
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        TelegramDestination $destination,
    ): void {
        $text = "📍 #{$destination->id} · {$destination->title}\n"
            ."chat_id: {$destination->chat_id}\n"
            ."نوع: {$destination->chat_type}\n"
            .'فعال: '.($destination->is_active ? 'بله' : 'خیر')."\n"
            ."دسترسی: {$destination->access_mode}";

        $keyboard = [
            [
                ['text' => $destination->is_active ? '⛔ غیرفعال' : '✅ فعال', 'callback_data' => 'admin:d:t:'.$destination->id],
            ],
            [
                ['text' => '◀️ لیست', 'callback_data' => 'admin:d:p:0'],
                ['text' => '🏠 داشبورد', 'callback_data' => 'admin:h'],
            ],
        ];

        $this->editOrSend($client, $chatId, $messageId, $text, ['inline_keyboard' => $keyboard]);
    }

    private function handleProfileCallback(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        string $data,
    ): void {
        if ($data === 'admin:p') {
            $this->renderProfileMenu($bot, $client, $chatId, $messageId);

            return;
        }

        $conversation = $this->conversations->forAccount($account);

        $flow = match ($data) {
            'admin:p:n' => 'profile_name',
            'admin:p:sn' => 'profile_short',
            'admin:p:d' => 'profile_desc',
            'admin:p:ph' => 'profile_photo',
            default => null,
        };

        if ($flow === null) {
            $this->renderProfileMenu($bot, $client, $chatId, $messageId);

            return;
        }

        if ($flow === 'profile_photo') {
            $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
                'admin' => ['flow' => 'profile_photo', 'draft' => []],
            ]);
            $client->sendMessage($chatId, 'یک عکس (نه فایل) برای پروفایل بات بفرستید، یا «لغو» بنویسید.');

            return;
        }

        $prompt = match ($flow) {
            'profile_name' => 'نام نمایشی بات (حداکثر ۶۴ کاراکتر):',
            'profile_short' => 'توضیح کوتاه (حداکثر ۱۲۰ کاراکتر):',
            'profile_desc' => 'توضیحات کامل (حداکثر ۵۱۲ کاراکتر):',
            default => '',
        };

        $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
            'admin' => ['flow' => $flow, 'draft' => []],
        ]);

        $client->sendMessage($chatId, "🤖 {$prompt}\n(یا «لغو»)");
    }

    private function renderProfileMenu(
        TelegramBot $bot,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
    ): void {
        $name = $bot->display_name;
        $short = '—';
        $desc = '—';

        try {
            $name = data_get($client->getMyName(), 'name') ?: $bot->display_name;
            $short = data_get($client->getMyShortDescription(), 'short_description') ?: '—';
            $desc = data_get($client->getMyDescription(), 'description') ?: '—';
        } catch (Throwable) {
            // keep fallbacks
        }

        $text = "🤖 پروفایل بات\n\n"
            ."نام: {$name}\n"
            ."توضیح کوتاه: ".mb_substr((string) $short, 0, 120)."\n"
            .'توضیحات: '.mb_substr((string) $desc, 0, 200);

        $keyboard = [
            [
                ['text' => '✏️ نام', 'callback_data' => 'admin:p:n'],
                ['text' => '✏️ توضیح کوتاه', 'callback_data' => 'admin:p:sn'],
            ],
            [
                ['text' => '✏️ توضیحات', 'callback_data' => 'admin:p:d'],
                ['text' => '🖼 عکس', 'callback_data' => 'admin:p:ph'],
            ],
            [
                ['text' => '🏠 داشبورد', 'callback_data' => 'admin:h'],
            ],
        ];

        $this->editOrSend($client, $chatId, $messageId, $text, ['inline_keyboard' => $keyboard]);
    }

    private function onProfileName(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
    ): void {
        $name = trim($text);
        if ($name === '') {
            throw new RuntimeException('نام خالی است.');
        }

        $client->setMyName(mb_substr($name, 0, 64));
        $bot->update(['display_name' => mb_substr($name, 0, 120)]);

        $this->finishProfileEdit($conversation, $client, $chatId, 'نام بات به‌روز شد.');
    }

    private function onProfileShort(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
    ): void {
        $client->setMyShortDescription(mb_substr(trim($text), 0, 120));
        $this->finishProfileEdit($conversation, $client, $chatId, 'توضیح کوتاه به‌روز شد.');
    }

    private function onProfileDescription(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
    ): void {
        $client->setMyDescription(mb_substr(trim($text), 0, 512));
        $this->finishProfileEdit($conversation, $client, $chatId, 'توضیحات به‌روز شد.');
    }

    private function finishProfileEdit(
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $message,
    ): void {
        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);

        $client->sendMessage($chatId, '✅ '.$message, [
            'reply_markup' => [
                'inline_keyboard' => [
                    [['text' => '🤖 پروفایل', 'callback_data' => 'admin:p']],
                    [['text' => '🏠 داشبورد', 'callback_data' => 'admin:h']],
                ],
            ],
        ]);
    }

    private function handleSettingsCallback(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        string $data,
    ): void {
        if ($data === 'admin:s:wh') {
            $base = rtrim((string) config('telegram_bot.webhook.base_url'), '/');
            $path = str_replace('{botKey}', $bot->key, (string) config('telegram_bot.webhook.path_pattern'));
            $url = $base.'/'.$path;
            $client->setWebhook($url, $bot->webhook_secret);
            $this->renderSettings($bot, $client, $chatId, $messageId, "✅ وب‌هوک ثبت شد:\n{$url}");

            return;
        }

        if ($data === 'admin:s:ac') {
            $bot->update(['is_active' => ! $bot->is_active]);
            $this->renderSettings($bot, $client, $chatId, $messageId, 'وضعیت ربات به‌روز شد.');

            return;
        }

        $this->renderSettings($bot, $client, $chatId, $messageId);
    }

    private function renderSettings(
        TelegramBot $bot,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        ?string $notice = null,
    ): void {
        $health = $this->health->run();
        $botHealth = $health['bots'][$bot->key] ?? [];
        $updates = $health['updates'] ?? [];

        $text = ($notice ? $notice."\n\n" : '')
            ."⚙️ تنظیمات و سلامت\n\n"
            .'ربات: '.($bot->is_active ? 'فعال ✅' : 'غیرفعال ⛔')."\n"
            .'توکن: '.(($botHealth['token_present'] ?? false) ? '✅' : '❌')."\n"
            .'API: '.(($botHealth['api_reachable'] ?? false) ? '✅' : '❌')."\n"
            .'وب‌هوک: '.($botHealth['webhook_url'] ?? '—')."\n"
            ."آپدیت معلق: ".($updates['pending'] ?? 0)."\n"
            .'آپدیت ناموفق: '.($updates['failed'] ?? 0);

        $siteButton = TelegramSiteUrl::inlineButton('پنل وب', TelegramSiteUrl::adminTelegram());
        $keyboard = [
            [
                ['text' => '🔗 ثبت وب‌هوک', 'callback_data' => 'admin:s:wh'],
                ['text' => $bot->is_active ? '⛔ غیرفعال' : '✅ فعال', 'callback_data' => 'admin:s:ac'],
            ],
            [
                ['text' => '🏠 داشبورد', 'callback_data' => 'admin:h'],
            ],
        ];

        if ($siteButton !== null) {
            array_unshift($keyboard, [$siteButton]);
        }

        $this->editOrSend($client, $chatId, $messageId, $text, ['inline_keyboard' => $keyboard]);
    }

    private function handleLogsCallback(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        string $data,
    ): void {
        if ($data === 'admin:l:rt') {
            $retried = 0;
            foreach ($this->updates->failedBatch(50) as $update) {
                $this->updates->resetToPending($update);
                ProcessTelegramUpdateJob::dispatch($update->id)
                    ->onQueue((string) config('telegram_bot.queues.inbound', 'telegram-inbound'));
                $retried++;
            }

            $this->renderLogs($bot, $client, $chatId, $messageId, "✅ {$retried} آپدیت دوباره در صف قرار گرفت.");

            return;
        }

        $this->renderLogs($bot, $client, $chatId, $messageId);
    }

    private function renderLogs(
        TelegramBot $bot,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        ?string $notice = null,
    ): void {
        $pending = TelegramUpdate::query()->where('telegram_bot_id', $bot->id)->where('status', UpdateStatus::Pending)->count();
        $failed = TelegramUpdate::query()->where('telegram_bot_id', $bot->id)->where('status', UpdateStatus::Failed)->count();
        $recentFailed = TelegramUpdate::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('status', UpdateStatus::Failed)
            ->orderByDesc('id')
            ->limit(5)
            ->get(['id', 'update_type', 'last_error']);

        $lines = [($notice ? $notice."\n\n" : '').'📋 لاگ‌ها', '', "معلق: {$pending}", "ناموفق: {$failed}", ''];

        foreach ($recentFailed as $item) {
            $lines[] = "#{$item->id} · {$item->update_type}";
            if ($item->last_error) {
                $lines[] = mb_substr((string) $item->last_error, 0, 80);
            }
        }

        $keyboard = [
            [['text' => '🔁 تلاش مجدد (۵۰)', 'callback_data' => 'admin:l:rt']],
            [['text' => '🏠 داشبورد', 'callback_data' => 'admin:h']],
        ];

        $this->editOrSend($client, $chatId, $messageId, implode("\n", $lines), ['inline_keyboard' => $keyboard]);
    }

    /** @param  array<string, mixed>  $replyMarkup */
    private function editOrSend(
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        string $text,
        array $replyMarkup,
    ): void {
        if ($messageId > 0) {
            try {
                $client->editMessageText($text, [
                    'chat_id' => $chatId,
                    'message_id' => $messageId,
                    'reply_markup' => $replyMarkup,
                ]);

                return;
            } catch (Throwable) {
                // Fall back to a fresh message when the old inline message cannot be edited.
            }
        }

        $client->sendMessage($chatId, $text, ['reply_markup' => $replyMarkup]);
    }

    private function accountLabel(TelegramAccount $account): string
    {
        $name = $account->display_name ?: trim(($account->first_name ?? '').' '.($account->last_name ?? ''));
        $name = $name !== '' ? $name : (string) $account->telegram_user_id;
        $flags = ($account->is_blocked ? '🚫' : '').($account->is_bot_admin ? '🛠' : '');

        return mb_substr($flags.$name, 0, 35);
    }

    private function broadcastStatusLabel(string $status): string
    {
        return match ($status) {
            'draft' => 'پیش‌نویس',
            'approved' => 'تأیید',
            'queued' => 'صف',
            'sending' => 'در حال ارسال',
            'finished' => 'تمام',
            'stopped' => 'متوقف',
            'scheduled' => 'زمان‌بندی',
            default => $status,
        };
    }

    private function answer(TelegramBotClientInterface $client, string $callbackId, string $text = '', bool $showAlert = false): void
    {
        if ($callbackId === '') {
            return;
        }

        $client->answerCallbackQuery($callbackId, [
            'text' => mb_substr($text, 0, 200),
            'show_alert' => $showAlert,
        ]);
    }

    private function materializeStaticProfileJpeg(string $sourcePath): string
    {
        if (! function_exists('imagecreatefromstring') || ! function_exists('imagejpeg')) {
            throw new RuntimeException('GD extension is required.');
        }

        $raw = file_get_contents($sourcePath);
        if ($raw === false) {
            throw new RuntimeException('خواندن تصویر ناموفق بود.');
        }

        $image = @imagecreatefromstring($raw);
        if ($image === false) {
            throw new RuntimeException('فرمت تصویر نامعتبر است.');
        }

        $width = imagesx($image);
        $height = imagesy($image);
        $cropSize = min($width, $height);
        $srcX = (int) floor(($width - $cropSize) / 2);
        $srcY = (int) floor(($height - $cropSize) / 2);

        $square = imagecreatetruecolor($cropSize, $cropSize);
        imagecopyresampled($square, $image, 0, 0, $srcX, $srcY, $cropSize, $cropSize, $cropSize, $cropSize);
        imagedestroy($image);

        $targetSize = min(640, max(320, $cropSize));
        if ($targetSize !== $cropSize) {
            $resized = imagecreatetruecolor($targetSize, $targetSize);
            imagecopyresampled($resized, $square, 0, 0, 0, 0, $targetSize, $targetSize, $cropSize, $cropSize);
            imagedestroy($square);
            $square = $resized;
        }

        $tmp = tempnam(sys_get_temp_dir(), 'tg_admin_avatar_');
        $jpgPath = $tmp.'.jpg';
        @unlink($tmp);
        imagejpeg($square, $jpgPath, 92);
        imagedestroy($square);

        return $jpgPath;
    }
}
