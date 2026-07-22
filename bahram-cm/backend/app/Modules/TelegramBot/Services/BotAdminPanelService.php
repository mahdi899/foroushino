<?php

namespace App\Modules\TelegramBot\Services;

use App\Enums\DiscountRestriction;
use App\Enums\DiscountType;
use App\Models\DiscountCode;
use App\Models\Product;
use App\Models\User;
use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Contracts\TelegramBotClientInterface;
use App\Modules\TelegramBot\Enums\BotAdminRank;
use App\Modules\TelegramBot\Enums\ConversationState;
use App\Modules\TelegramBot\Support\TelegramCustomEmoji;
use App\Modules\TelegramBot\Support\TelegramHtml;
use App\Modules\TelegramBot\Enums\UpdateStatus;
use App\Modules\TelegramBot\Jobs\ProcessTelegramUpdateJob;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramBroadcast;
use App\Modules\TelegramBot\Models\TelegramBroadcastRecipient;
use App\Modules\TelegramBot\Models\TelegramConversation;
use App\Modules\TelegramBot\Models\TelegramDestination;
use App\Modules\TelegramBot\Models\TelegramDestinationRequirement;
use App\Modules\TelegramBot\Models\TelegramRequiredChat;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use App\Modules\TelegramBot\Repositories\TelegramUpdateRepository;
use App\Modules\TelegramBot\Support\TelegramSiteUrl;
use App\Support\JalaliDate;
use RuntimeException;
use Throwable;

class BotAdminPanelService
{
    use BotAdminPanelFeatureHandlers;

    private const USERS_PER_PAGE = 8;

    private const DESTINATIONS_PER_PAGE = 6;

    public function __construct(
        private readonly TelegramBotClientFactory $clients,
        private readonly ConversationService $conversations,
        private readonly HealthCheckService $health,
        private readonly BroadcastDispatchService $broadcastDispatch,
        private readonly TelegramUpdateRepository $updates,
        private readonly TelegramAdminUserStatsService $userStats,
        private readonly RequiredChatMembershipService $requiredChats,
        private readonly BotUsageStatsService $usageStats,
        private readonly TelegramUserExportService $userExport,
        private readonly BotTicketDeliveryService $ticketDelivery,
        private readonly BotMessageCatalog $messageCatalog,
        private readonly TelegramAudienceSegmentResolver $audienceSegments,
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
            'parse_mode' => 'HTML',
            'reply_markup' => $this->adminMenuMarkup($account),
        ]);
    }

    /** @return array<string, mixed> */
    private function adminMenuMarkup(TelegramAccount $account): array
    {
        return app(AdminMenuKeyboard::class)->replyMarkup($account);
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

        // Stop the loading spinner immediately — handlers may call Telegram API afterward.
        $this->answer($client, $callbackId);

        try {
            match (true) {
                $data === 'admin:h' => $this->showHome($bot, $account, $client, $chatId, $messageId),
                str_starts_with($data, 'admin:u:') => $this->handleUsersCallback($bot, $account, $client, $chatId, $messageId, $data),
                str_starts_with($data, 'admin:admins:rank:') => $this->applyAdminRankChoice($bot, $account, $client, $chatId, $messageId, $data),
                str_starts_with($data, 'admin:admins:') => $this->handleAdminsCallback($bot, $account, $client, $chatId, $messageId, $data),
                str_starts_with($data, 'admin:b:sg:') => $this->handleBroadcastSegmentPick($bot, $account, $client, $chatId, $messageId, $data),
                str_starts_with($data, 'admin:b:') => $this->handleBroadcastsCallback($bot, $account, $client, $chatId, $messageId, $data),
                str_starts_with($data, 'admin:tk:') => $this->handleTicketsCallback($bot, $account, $client, $chatId, $messageId, $data),
                str_starts_with($data, 'admin:msg:') => $this->handleMessagesCallback($bot, $account, $client, $chatId, $messageId, $data),
                str_starts_with($data, 'admin:ex:') => $this->handleExportCallback($bot, $account, $client, $chatId, $messageId, $data),
                str_starts_with($data, 'admin:rc:') => $this->handleRequiredChatsCallback($bot, $account, $client, $chatId, $messageId, $data),
                str_starts_with($data, 'admin:dc:') => $this->handleDiscountsCallback($bot, $account, $client, $chatId, $messageId, $data),
                str_starts_with($data, 'admin:d:') => $this->handleDestinationsCallback($bot, $account, $client, $chatId, $messageId, $data),
                str_starts_with($data, 'admin:p') => $this->handleProfileCallback($bot, $account, $client, $chatId, $messageId, $data),
                str_starts_with($data, 'admin:s') => $this->handleSettingsCallback($bot, $account, $client, $chatId, $messageId, $data),
                str_starts_with($data, 'admin:ev:') => $this->handleEventsCallback($bot, $account, $client, $chatId, $messageId, $data),
                str_starts_with($data, 'admin:l') => $this->handleLogsCallback($bot, $account, $client, $chatId, $messageId, $data),
                default => $this->showHome($bot, $account, $client, $chatId, $messageId),
            };
        } catch (Throwable $e) {
            // Callback query was already answered above — show the error as a chat message.
            try {
                $client->sendMessage($chatId, '⚠️ '.mb_substr($e->getMessage(), 0, 500), [
                    'reply_markup' => $this->adminMenuMarkup($account),
                ]);
            } catch (Throwable) {
                // ignore secondary failures
            }
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

        if ($conversation->state === ConversationState::AdminPanel) {
            if (in_array($text, [AdminMenuKeyboard::EXIT, '❌ خروج از پنل ادمین', 'لغو', '/cancel'], true)
                || app(AdminMenuKeyboard::class)->normalizeLabel($text) === AdminMenuKeyboard::EXIT) {
                $this->conversations->reset($conversation);
                $client = $this->clients->forBot($bot);
                $client->sendMessage($chatId, 'به منوی اصلی برگشتید.', [
                    'reply_markup' => app(MainMenuKeyboard::class)->replyMarkup($account, $bot),
                ]);

                return true;
            }

            if (app(AdminMenuKeyboard::class)->isMenuButton($text)) {
                $this->handleAdminMenuButton($bot, $account, $chatId, $text);

                return true;
            }

            if (app(MainMenuKeyboard::class)->isMenuButton($text, $account, $bot)) {
                $this->conversations->reset($conversation);

                return false;
            }
        }

        if ($conversation->state !== ConversationState::AdminWaitingInput) {
            return false;
        }

        $admin = (array) ($conversation->context['admin'] ?? []);
        $flow = (string) ($admin['flow'] ?? '');
        $client = $this->clients->forBot($bot);

        if (app(AdminMenuKeyboard::class)->isMenuButton($text)) {
            $this->conversations->transition($conversation, ConversationState::AdminPanel, [
                'admin' => ['flow' => null, 'draft' => []],
            ]);
            $this->handleAdminMenuButton($bot, $account, $chatId, $text);

            return true;
        }

        if (app(MainMenuKeyboard::class)->isMenuButton($text, $account, $bot)) {
            $this->conversations->reset($conversation);

            return false;
        }

        if (app(AdminsSectionKeyboard::class)->isBack($text) && in_array($flow, ['admin_add', 'admin_add_name'], true)) {
            $this->conversations->transition($conversation, ConversationState::AdminPanel, [
                'admin' => ['flow' => null, 'draft' => []],
            ]);
            $this->openAdminsSection($bot, $account, $client, $chatId);

            return true;
        }

        if ($text === '/cancel' || $text === 'لغو') {
            $this->conversations->transition($conversation, ConversationState::AdminPanel, [
                'admin' => ['flow' => null, 'draft' => []],
            ]);
            $client->sendMessage($chatId, 'لغو شد.', [
                'reply_markup' => $this->adminMenuMarkup($account),
            ]);

            return true;
        }

        try {
            match ($flow) {
                'user_search' => $this->onUserSearch($bot, $account, $conversation, $client, $chatId, $text),
                'admin_add' => $this->onAdminAddById($bot, $account, $conversation, $client, $chatId, $text),
                'admin_add_name' => $this->onAdminAddDisplayName($bot, $account, $conversation, $client, $chatId, $text),
                'card_to_card_text' => $this->onCardToCardText($bot, $account, $conversation, $client, $chatId, $text),
                'reports_group' => $this->onReportsGroupInput($bot, $account, $conversation, $client, $chatId, $text),
                'payment_reports' => $this->onPaymentReportsInput($bot, $account, $conversation, $client, $chatId, $text),
                'rc_add' => $this->onRequiredChatAddInput($bot, $account, $conversation, $client, $chatId, $text),
                'rc_rename' => $this->onRequiredChatRenameInput($bot, $account, $conversation, $client, $chatId, $text),
                'dest_add' => $this->onDestinationAddInput($bot, $account, $conversation, $client, $chatId, $text),
                'dest_rename' => $this->onDestinationRenameInput($bot, $account, $conversation, $client, $chatId, $text),
                'dc_add_code' => $this->onDiscountWizardStep($bot, $account, $conversation, $client, $chatId, $text, 'code'),
                'dc_add_percent' => $this->onDiscountWizardStep($bot, $account, $conversation, $client, $chatId, $text, 'percent'),
                'dc_add_user' => $this->onDiscountWizardStep($bot, $account, $conversation, $client, $chatId, $text, 'user'),
                'dc_add_expires' => $this->onDiscountWizardStep($bot, $account, $conversation, $client, $chatId, $text, 'expires'),
                'dc_add_max_uses' => $this->onDiscountWizardStep($bot, $account, $conversation, $client, $chatId, $text, 'max_uses'),
                'dc_add_max_per_user' => $this->onDiscountWizardStep($bot, $account, $conversation, $client, $chatId, $text, 'max_per_user'),
                'dc_add_product' => $this->onDiscountWizardStep($bot, $account, $conversation, $client, $chatId, $text, 'product'),
                'dm_user' => $this->onDmUser($bot, $account, $conversation, $client, $chatId, $text),
                'broadcast_quick' => $this->onBroadcastQuick($bot, $account, $conversation, $client, $chatId, $text),
                'ticket_reply' => $this->onTicketReply($bot, $account, $conversation, $client, $chatId, $text),
                'message_edit' => $this->onMessageEdit($bot, $account, $conversation, $client, $chatId, $text),
                'zarinpal_merchant' => $this->onZarinpalMerchantInput($bot, $account, $conversation, $client, $chatId, $text),
                'zarinpal_merchant_confirm' => $this->onZarinpalMerchantConfirm($bot, $account, $conversation, $client, $chatId, $text),
                'events_chat_ids' => $this->onEventsChatIdsInput($bot, $account, $conversation, $client, $chatId, $text),
                'profile_name' => $this->onProfileName($bot, $account, $conversation, $client, $chatId, $text),
                'profile_short' => $this->onProfileShort($bot, $account, $conversation, $client, $chatId, $text),
                'profile_desc' => $this->onProfileDescription($bot, $account, $conversation, $client, $chatId, $text),
                default => throw new RuntimeException('مرحله نامعتبر. «لغو» بزنید و دوباره شروع کنید.'),
            };
        } catch (Throwable $e) {
            $client->sendMessage($chatId, 'خطا: '.$e->getMessage(), [
                'reply_markup' => $this->adminMenuMarkup($account),
            ]);
        }

        return true;
    }

    private function handleAdminMenuButton(TelegramBot $bot, TelegramAccount $account, int $chatId, string $text): void
    {
        $client = $this->clients->forBot($bot);
        $text = app(AdminMenuKeyboard::class)->normalizeLabel($text) ?? trim($text);

        $permission = match ($text) {
            AdminMenuKeyboard::USERS => \App\Modules\TelegramBot\Enums\BotAdminPermission::UserInfo,
            AdminMenuKeyboard::STATS => \App\Modules\TelegramBot\Enums\BotAdminPermission::Stats,
            AdminMenuKeyboard::BROADCAST => \App\Modules\TelegramBot\Enums\BotAdminPermission::Broadcast,
            AdminMenuKeyboard::REQUIRED_CHATS => \App\Modules\TelegramBot\Enums\BotAdminPermission::ForcedJoin,
            AdminMenuKeyboard::DESTINATIONS => \App\Modules\TelegramBot\Enums\BotAdminPermission::Menus,
            AdminMenuKeyboard::DISCOUNTS => \App\Modules\TelegramBot\Enums\BotAdminPermission::Discount,
            AdminMenuKeyboard::TICKETS => \App\Modules\TelegramBot\Enums\BotAdminPermission::Tickets,
            AdminMenuKeyboard::MESSAGES => \App\Modules\TelegramBot\Enums\BotAdminPermission::Messages,
            AdminMenuKeyboard::EXPORT => \App\Modules\TelegramBot\Enums\BotAdminPermission::DataExport,
            AdminMenuKeyboard::PROFILE, AdminMenuKeyboard::SETTINGS => \App\Modules\TelegramBot\Enums\BotAdminPermission::Settings,
            AdminMenuKeyboard::LOGS => \App\Modules\TelegramBot\Enums\BotAdminPermission::Stats,
            AdminMenuKeyboard::EVENTS => \App\Modules\TelegramBot\Enums\BotAdminPermission::Events,
            AdminMenuKeyboard::ADMINS, AdminMenuKeyboard::HOME, AdminMenuKeyboard::EXIT => null,
            default => null,
        };

        if ($text === AdminMenuKeyboard::ADMINS && ! $account->canManageBotAdmins()) {
            $client->sendMessage($chatId, '⛔ فقط ادمین برتر می‌تواند ادمین‌ها را مدیریت کند.', [
                'reply_markup' => $this->adminMenuMarkup($account),
            ]);

            return;
        }

        if ($permission !== null && ! $account->hasBotAdminPermission($permission)) {
            $client->sendMessage($chatId, '⛔ دسترسی «'.$permission->labelFa().'» برای شما فعال نیست.', [
                'reply_markup' => $this->adminMenuMarkup($account),
            ]);

            return;
        }

        match ($text) {
            AdminMenuKeyboard::USERS => $this->renderUsersSearchHub($bot, $account, $client, $chatId, 0),
            AdminMenuKeyboard::ADMINS => $this->openAdminsSection($bot, $account, $client, $chatId),
            AdminMenuKeyboard::STATS => $this->openStatsSection($bot, $account, $client, $chatId),
            AdminMenuKeyboard::BROADCAST => $this->startBroadcastFlow($bot, $account, $client, $chatId),
            AdminMenuKeyboard::REQUIRED_CHATS => $this->handleRequiredChatsCallback($bot, $account, $client, $chatId, 0, 'admin:rc:p:0'),
            AdminMenuKeyboard::DESTINATIONS => $this->handleDestinationsCallback($bot, $account, $client, $chatId, 0, 'admin:d:list'),
            AdminMenuKeyboard::DISCOUNTS => $this->handleDiscountsCallback($bot, $account, $client, $chatId, 0, 'admin:dc:list'),
            AdminMenuKeyboard::TICKETS => $this->openTicketsSection($bot, $account, $client, $chatId),
            AdminMenuKeyboard::MESSAGES => $this->openMessagesSection($bot, $account, $client, $chatId),
            AdminMenuKeyboard::EXPORT => $this->openExportSection($bot, $account, $client, $chatId),
            AdminMenuKeyboard::PROFILE => $this->handleProfileCallback($bot, $account, $client, $chatId, 0, 'admin:p'),
            AdminMenuKeyboard::SETTINGS => $this->handleSettingsCallback($bot, $account, $client, $chatId, 0, 'admin:s'),
            AdminMenuKeyboard::LOGS => $this->handleLogsCallback($bot, $account, $client, $chatId, 0, 'admin:l'),
            AdminMenuKeyboard::EVENTS => $this->openEventsSection($bot, $account, $client, $chatId),
            AdminMenuKeyboard::HOME => $this->showHome($bot, $account, $client, $chatId, 0),
            default => $this->showHome($bot, $account, $client, $chatId, 0),
        };
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
            'reply_markup' => app(MainMenuKeyboard::class)->replyMarkup($account, $bot),
        ]);

        return false;
    }

    private function dashboardText(TelegramBot $bot): string
    {
        $total = TelegramAccount::query()->where('telegram_bot_id', $bot->id)->count();
        $linked = TelegramAccount::query()->where('telegram_bot_id', $bot->id)->whereNotNull('user_id')->count();
        $blocked = TelegramAccount::query()->where('telegram_bot_id', $bot->id)->where('is_blocked', true)->count();
        $admins = TelegramAccount::query()->where('telegram_bot_id', $bot->id)->where('is_bot_admin', true)->count();
        $requiredChats = TelegramRequiredChat::query()->where('telegram_bot_id', $bot->id)->where('is_active', true)->count();
        $e = static fn (string $key): string => TelegramCustomEmoji::tag($key);

        return $e('tools').' <b>پنل ادمین بات</b>'."\n\n"
            .'ربات: '.TelegramHtml::escape((string) $bot->display_name)
            .' ('.TelegramHtml::escape((string) $bot->key).")\n"
            .$e('user')." مخاطبان: {$total} · متصل: {$linked} · مسدود: {$blocked}\n"
            .$e('shield')." ادمین‌های بات: {$admins}\n"
            .$e('tv')." کانال اجباری فعال: {$requiredChats}\n\n"
            .'از دکمه‌های پایین برای مدیریت استفاده کنید.'."\n"
            .'برای لغو هر مرحله «لغو» بنویسید.';
    }

    /** @return array<string, mixed> */
    private function mainInlineMenu(): array
    {
        $b = static fn (string $text, string $cb, string $icon): array => AdminMenuKeyboard::inlineButton($text, $cb, $icon);

        return [
            'inline_keyboard' => [
                [
                    $b('کاربران', 'admin:u:s', 'user'),
                    $b('ادمین‌ها', 'admin:admins:p:0', 'shield'),
                ],
                [
                    $b('پیام همگانی', 'admin:b:q', 'channel'),
                    $b('کانال اجباری', 'admin:rc:p:0', 'tv'),
                ],
                [
                    $b('مقاصد', 'admin:d:list', 'pin'),
                    $b('پروفایل بات', 'admin:p', 'robot'),
                ],
                [
                    $b('تنظیمات', 'admin:s', 'tools'),
                    $b('لاگ‌ها', 'admin:l', 'notes'),
                ],
                [
                    $b('داشبورد', 'admin:h', 'home'),
                    $b('خروج', 'admin:x', 'cross'),
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
                    AdminMenuKeyboard::inlineButton('داشبورد', 'admin:h', 'home'),
                    AdminMenuKeyboard::inlineButton('خروج', 'admin:x', 'cross'),
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

        if ($messageId > 0) {
            $client->editMessageText($text, [
                'chat_id' => $chatId,
                'message_id' => $messageId,
                'parse_mode' => 'HTML',
            ]);
            $client->sendMessage($chatId, 'منوی پنل ادمین پایین صفحه است.', [
                'reply_markup' => $this->adminMenuMarkup($account),
            ]);

            return;
        }

        $client->sendMessage($chatId, $text, [
            'parse_mode' => 'HTML',
            'reply_markup' => $this->adminMenuMarkup($account),
        ]);
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
            'reply_markup' => app(MainMenuKeyboard::class)->replyMarkup($account, $account->bot),
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
        $action = $parts[2] ?? 's';

        if ($action === 's' || $action === 'p') {
            $this->renderUsersSearchHub($bot, $account, $client, $chatId, $messageId);

            return;
        }

        $userId = (int) ($parts[3] ?? 0);
        $target = $this->nonAdminUsersQuery($bot)->whereKey($userId)->first()
            ?? TelegramAccount::query()->where('telegram_bot_id', $bot->id)->whereKey($userId)->first();

        if ($target === null) {
            throw new RuntimeException('کاربر یافت نشد.');
        }

        if ($target->isBotAdmin() && $action === 'i') {
            throw new RuntimeException('این حساب ادمین است. از بخش «ادمین‌ها» مشاهده کنید.');
        }

        if ($action === 'i') {
            $this->renderUserDetail($bot, $account, $client, $chatId, $messageId, $target);

            return;
        }

        if ($action === 'b') {
            if ($target->isPermanentBotAdmin() || $target->isBotAdmin()) {
                throw new RuntimeException('امکان مسدود کردن ادمین از بخش کاربران وجود ندارد.');
            }
            $target->update(['is_blocked' => ! $target->is_blocked]);
            $this->renderUserDetail($bot, $account, $client, $chatId, $messageId, $target->fresh());

            return;
        }

        if ($action === 'msg') {
            $conversation = $this->conversations->forAccount($account);
            $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
                'admin' => ['flow' => 'dm_user', 'draft' => ['target_account_id' => $target->id]],
            ]);
            $client->sendMessage($chatId, "📩 ارسال پیام به کاربر #{$target->telegram_user_id}\n\nمتن پیام را بنویسید (یا «لغو»):", [
                'reply_markup' => $this->adminMenuMarkup($account),
            ]);

            return;
        }

        if ($action === 'pay') {
            $this->renderUserPayments($client, $chatId, $messageId, $target);

            return;
        }

        if ($action === 'sub') {
            $this->renderUserSubscriptions($client, $chatId, $messageId, $target);

            return;
        }

        if ($action === 'refu') {
            $this->renderReferralUsers($bot, $client, $chatId, $messageId, $target);

            return;
        }

        if ($action === 'refs') {
            $this->renderReferralSubscriptions($bot, $client, $chatId, $messageId, $target);

            return;
        }

        if ($action === 'coop') {
            $stats = $this->userStats->forAccount($target);
            $client->sendMessage(
                $chatId,
                "🎯 درصد همکاری کاربر #{$target->telegram_user_id}: {$stats['cooperation_percent']}%\n\n"
                .'این درصد از تنظیمات کش‌بک محصولات فعال گرفته می‌شود.',
                ['reply_markup' => $this->adminMenuMarkup($account)],
            );

            return;
        }

        if ($action === 'a') {
            if (! $account->canManageBotAdmins()) {
                throw new RuntimeException('فقط ادمین برتر می‌تواند ادمین را اضافه/حذف کند.');
            }
            if ($target->isPermanentBotAdmin()) {
                if (! $target->is_bot_admin) {
                    $target->update(['is_bot_admin' => true, 'bot_admin_rank' => BotAdminRank::Super]);
                }
                $this->renderUserDetail($bot, $account, $client, $chatId, $messageId, $target->fresh());
                throw new RuntimeException('این کاربر ادمین دائمی است و قابل حذف نیست.');
            }

            if ($target->is_bot_admin) {
                $target->revokeBotAdmin();
                $this->renderUserDetail($bot, $account, $client, $chatId, $messageId, $target->fresh());

                return;
            }

            $target->grantAllBotAdminPermissions($target->adminDisplayName(), BotAdminRank::Simple);
            $this->renderUsersSearchHub($bot, $account, $client, $chatId, $messageId);
            $client->sendMessage($chatId, 'کاربر به‌عنوان ادمین ساده اضافه شد. از بخش «ادمین‌ها» رده و دسترسی‌ها را تنظیم کنید.');

            return;
        }
    }

    private function renderUsersSearchHub(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
    ): void {
        $totalUsers = $this->nonAdminUsersQuery($bot)->count();
        $conversation = $this->conversations->forAccount($account);
        $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
            'admin' => ['flow' => 'user_search', 'draft' => []],
        ]);

        $text = "👥 مدیریت کاربران\n\n"
            ."تعداد کل کاربران (بدون ادمین): {$totalUsers}\n\n"
            ."از کیبورد پایین «👥 کاربران» همیشه در دسترس است.\n"
            ."شناسه عددی تلگرام یا یوزرنیم را همین‌جا بفرستید.\n"
            .'مثال: 303360676 یا mahdi_akbari';

        $keyboard = [
            [
                ['text' => '🛡 ادمین‌ها', 'callback_data' => 'admin:admins:p:0'],
                ['text' => '🏠 داشبورد', 'callback_data' => 'admin:h'],
            ],
        ];

        $this->editOrSend($client, $chatId, $messageId, $text, ['inline_keyboard' => $keyboard]);
        if ($messageId <= 0) {
            $client->sendMessage($chatId, 'منوی پنل ادمین پایین صفحه فعال است.', [
                'reply_markup' => $this->adminMenuMarkup($account),
            ]);
        }
    }

    private function onUserSearch(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
    ): void {
        $query = trim($text);
        $query = ltrim($query, '@');

        $targetQuery = $this->nonAdminUsersQuery($bot);

        if (ctype_digit($query)) {
            $id = (int) $query;
            $target = (clone $targetQuery)
                ->where(function ($q) use ($id): void {
                    $q->where('telegram_user_id', $id)->orWhere('id', $id);
                })
                ->first();
        } else {
            $target = (clone $targetQuery)
                ->whereRaw('LOWER(telegram_username) = ?', [strtolower($query)])
                ->first();
        }

        if ($target === null) {
            // If they searched an admin, hint to use admins section
            $adminHit = TelegramAccount::query()
                ->where('telegram_bot_id', $bot->id)
                ->where(function ($q) use ($query): void {
                    if (ctype_digit($query)) {
                        $id = (int) $query;
                        $q->where('telegram_user_id', $id)->orWhere('id', $id);
                    } else {
                        $q->whereRaw('LOWER(telegram_username) = ?', [strtolower($query)]);
                    }
                })
                ->first();

            if ($adminHit?->isBotAdmin()) {
                $client->sendMessage($chatId, 'این حساب ادمین است. از بخش «ادمین‌ها» مشاهده کنید.', [
                    'reply_markup' => [
                        'inline_keyboard' => [
                            [['text' => '🛡 ادمین‌ها', 'callback_data' => 'admin:admins:p:0']],
                            [['text' => '🏠 داشبورد', 'callback_data' => 'admin:h']],
                        ],
                    ],
                ]);

                return;
            }

            $client->sendMessage($chatId, 'کاربری با این شناسه/یوزرنیم پیدا نشد. دوباره ارسال کنید یا «لغو».', [
                'reply_markup' => $this->backHomeMarkup(),
            ]);

            return;
        }

        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);

        $this->renderUserDetail($bot, $account, $client, $chatId, 0, $target);
    }

    private function openAdminsSection(
        TelegramBot $bot,
        TelegramAccount $actor,
        TelegramBotClientInterface $client,
        int $chatId,
    ): void {
        if (! $actor->canManageBotAdmins()) {
            $client->sendMessage($chatId, '⛔ فقط ادمین برتر می‌تواند ادمین‌ها را مدیریت کند.', [
                'reply_markup' => $this->adminMenuMarkup($actor),
            ]);

            return;
        }

        $conversation = $this->conversations->forAccount($actor);
        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);

        $this->renderAdminsTable($bot, $client, $chatId, 0);
        $client->sendMessage($chatId, 'برای افزودن ادمین روی ➕ افزودن بزنید.', [
            'reply_markup' => $this->adminMenuMarkup($actor),
        ]);
    }

    private function beginAddAdminFlow(
        TelegramBot $bot,
        TelegramAccount $actor,
        TelegramBotClientInterface $client,
        int $chatId,
    ): void {
        $conversation = $this->conversations->forAccount($actor);
        $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
            'admin' => ['flow' => 'admin_add', 'draft' => []],
        ]);
        $client->sendMessage(
            $chatId,
            "🆔 ایدی عددی کاربر مورد نظر را با اعداد لاتین ارسال کنید و یا با استفاده از دکمه زیر کاربر مورد نظر را انتخاب کنید:",
            ['reply_markup' => app(AdminsSectionKeyboard::class)->replyMarkup()],
        );
    }

    private function onCardToCardText(
        TelegramBot $bot,
        TelegramAccount $actor,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
    ): void {
        $body = trim($text);
        if (mb_strlen($body) < 10) {
            $client->sendMessage($chatId, 'متن کارت‌به‌کارت خیلی کوتاه است. دوباره بفرستید یا «لغو».');

            return;
        }

        $bot->setCardToCardInstructions($body);
        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);
        $client->sendMessage($chatId, '✅ متن کارت‌به‌کارت ذخیره شد.', [
            'reply_markup' => $this->adminMenuMarkup($actor),
        ]);
        $this->renderSettings($bot->fresh() ?? $bot, $client, $chatId, 0);
    }

    private function onReportsGroupInput(
        TelegramBot $bot,
        TelegramAccount $actor,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
    ): void {
        $raw = trim(str_replace(['`', ' ', "\u{200c}"], '', $text));

        if (in_array(mb_strtolower($raw), ['/null', 'null', 'none', 'پاک', 'حذف'], true)) {
            $bot->setReportsGroupChatId(null);
            $this->conversations->transition($conversation, ConversationState::AdminPanel, [
                'admin' => ['flow' => null, 'draft' => []],
            ]);
            $client->sendMessage($chatId, '✅ گروه گزارشات پاک شد.', [
                'reply_markup' => $this->adminMenuMarkup($actor),
            ]);
            $this->renderSettings($bot->fresh() ?? $bot, $client, $chatId, 0);

            return;
        }

        if (! preg_match('/^-100\d{5,}$/', $raw) && ! preg_match('/^-\d{8,}$/', $raw)) {
            $client->sendMessage(
                $chatId,
                "لطفاً فقط آیدی عددی گروه را بفرستید.\n"
                ."مثال درست:\n`-1003623149563`\n\n"
                ."اول ربات را در گروه ادمین کنید، بعد همین آیدی را بفرستید.\n"
                .'برای پاک کردن `/null` بفرستید.',
                ['parse_mode' => 'Markdown'],
            );

            return;
        }

        try {
            $this->assertBotIsChannelAdmin($bot, $client, $raw);
        } catch (Throwable $e) {
            $client->sendMessage(
                $chatId,
                '❌ ثبت گروه گزارشات ناموفق بود:'."\n".$e->getMessage()."\n\n"
                .'مطمئن شوید ربات در گروه ادمین است و دوباره آیدی را بفرستید.',
            );

            return;
        }

        $title = $raw;
        try {
            $chatInfo = $client->getChat($raw);
            $title = (string) ($chatInfo['title'] ?? $raw);
        } catch (Throwable) {
            // title is optional
        }

        $bot->setReportsGroupChatId($raw);

        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);
        $client->sendMessage(
            $chatId,
            "✅ گروه گزارشات ذخیره شد:\n{$title}\n`{$raw}`\n\n"
            .'از این به بعد پیام‌های پشتیبانی فقط در همین گروه می‌آید — نه در چت خصوصی ادمین.',
            [
                'parse_mode' => 'Markdown',
                'reply_markup' => $this->adminMenuMarkup($actor),
            ],
        );
        $this->renderSettings($bot->fresh() ?? $bot, $client, $chatId, 0);
    }

    private function onPaymentReportsInput(
        TelegramBot $bot,
        TelegramAccount $actor,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
    ): void {
        $raw = trim(str_replace(['`', ' ', "\u{200c}"], '', $text));

        if (in_array(mb_strtolower($raw), ['/null', 'null', 'none', 'پاک', 'حذف'], true)) {
            $bot->setPaymentReportsChatId(null);
            $this->conversations->transition($conversation, ConversationState::AdminPanel, [
                'admin' => ['flow' => null, 'draft' => []],
            ]);
            $client->sendMessage($chatId, '✅ گروه گزارشات پرداخت پاک شد.', [
                'reply_markup' => $this->adminMenuMarkup($actor),
            ]);
            $this->renderSettings($bot->fresh() ?? $bot, $client, $chatId, 0);

            return;
        }

        if (! preg_match('/^-100\d{5,}$/', $raw) && ! preg_match('/^-\d{8,}$/', $raw)) {
            $client->sendMessage(
                $chatId,
                "لطفاً فقط آیدی عددی گروه/کانال را بفرستید.\n"
                ."مثال درست:\n`-1003623149563`\n\n"
                ."اول ربات را ادمین کنید، بعد همین آیدی را بفرستید.\n"
                .'برای پاک کردن `/null` بفرستید.',
                ['parse_mode' => 'Markdown'],
            );

            return;
        }

        try {
            $this->assertBotIsChannelAdmin($bot, $client, $raw);
        } catch (Throwable $e) {
            $client->sendMessage(
                $chatId,
                '❌ ثبت گزارشات پرداخت ناموفق بود:'."\n".$e->getMessage()."\n\n"
                .'مطمئن شوید ربات ادمین است و دوباره آیدی را بفرستید.',
            );

            return;
        }

        $title = $raw;
        try {
            $chatInfo = $client->getChat($raw);
            $title = (string) ($chatInfo['title'] ?? $raw);
        } catch (Throwable) {
            // title is optional
        }

        $bot->setPaymentReportsChatId($raw);

        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);
        $client->sendMessage(
            $chatId,
            "✅ گزارشات پرداخت ذخیره شد:\n{$title}\n`{$raw}`\n\n"
            .'رسید کارت‌به‌کارت و خریدهای موفق فقط اینجا می‌آید — نه در چت خصوصی ادمین.',
            [
                'parse_mode' => 'Markdown',
                'reply_markup' => $this->adminMenuMarkup($actor),
            ],
        );
        $this->renderSettings($bot->fresh() ?? $bot, $client, $chatId, 0);
    }

    private function handleAdminsCallback(
        TelegramBot $bot,
        TelegramAccount $actor,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        string $data,
    ): void {
        if (! $actor->canManageBotAdmins()) {
            throw new RuntimeException('فقط ادمین برتر می‌تواند ادمین‌ها را مدیریت کند.');
        }

        $parts = explode(':', $data);
        $action = $parts[2] ?? 'list';

        if ($action === 'add') {
            $this->beginAddAdminFlow($bot, $actor, $client, $chatId);

            return;
        }

        if ($action === 'list' || $action === 'p') {
            $this->renderAdminsTable($bot, $client, $chatId, $messageId);

            return;
        }

        $targetId = (int) ($parts[3] ?? 0);
        $target = TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->whereKey($targetId)
            ->first();

        if ($target === null) {
            throw new RuntimeException('ادمین یافت نشد.');
        }

        if ($action === 'perm') {
            $this->renderAdminPermissions($client, $chatId, $messageId, $target);

            return;
        }

        if ($action === 't') {
            $permKey = (string) ($parts[4] ?? '');
            $permission = \App\Modules\TelegramBot\Enums\BotAdminPermission::tryFrom($permKey);
            if ($permission === null) {
                throw new RuntimeException('دسترسی نامعتبر است.');
            }
            if ($target->isPermanentBotAdmin()) {
                throw new RuntimeException('دسترسی ادمین دائمی قابل تغییر نیست.');
            }
            $target->toggleBotAdminPermission($permission);
            $fresh = $target->fresh() ?? $target;
            $this->renderAdminPermissions($client, $chatId, $messageId, $fresh);

            $effect = match ($permission) {
                \App\Modules\TelegramBot\Enums\BotAdminPermission::Menus => 'دکمه «📍 مقاصد»',
                \App\Modules\TelegramBot\Enums\BotAdminPermission::Broadcast => 'دکمه «📣 پیام همگانی»',
                \App\Modules\TelegramBot\Enums\BotAdminPermission::UserInfo => 'دکمه «👥 کاربران»',
                \App\Modules\TelegramBot\Enums\BotAdminPermission::ForcedJoin => 'دکمه «📻 کانال اجباری»',
                \App\Modules\TelegramBot\Enums\BotAdminPermission::Settings => 'دکمه‌های «⚙️ تنظیمات / 🤖 پروفایل»',
                \App\Modules\TelegramBot\Enums\BotAdminPermission::Stats => 'دکمه‌های «📊 آمار / 📋 لاگ‌ها»',
                \App\Modules\TelegramBot\Enums\BotAdminPermission::Tickets => 'دکمه «🎫 تیکت‌ها»',
                \App\Modules\TelegramBot\Enums\BotAdminPermission::Messages => 'دکمه «💬 پیام‌ها»',
                \App\Modules\TelegramBot\Enums\BotAdminPermission::DataExport => 'دکمه «📤 خروجی کاربران»',
                default => null,
            };
            $on = $fresh->hasBotAdminPermission($permission);
            if ($effect !== null) {
                $client->sendMessage(
                    $chatId,
                    ($on ? '✅ فعال شد: ' : '❌ غیرفعال شد: ').$permission->labelFa()
                    ."\n→ برای این ادمین ".$effect.($on ? ' در منوی پایین دیده می‌شود.' : ' از منوی پایین حذف می‌شود.'),
                );
            }

            if ((int) $fresh->id === (int) $actor->id) {
                $client->sendMessage($chatId, '⌨️ منوی پایین شما همین الان به‌روز شد.', [
                    'reply_markup' => $this->adminMenuMarkup($fresh),
                ]);
            }

            return;
        }

        if ($action === 'del') {
            if ($target->isPermanentBotAdmin()) {
                throw new RuntimeException('ادمین دائمی قابل حذف نیست.');
            }
            if ((int) $target->id === (int) $actor->id) {
                throw new RuntimeException('نمی‌توانید خودتان را حذف کنید.');
            }
            $target->update([
                'is_bot_admin' => false,
                'bot_admin_rank' => null,
                'metadata' => array_merge((array) ($target->metadata ?? []), [
                    'bot_admin_permissions' => [],
                ]),
            ]);
            $this->renderAdminsTable($bot, $client, $chatId, $messageId);
            $client->sendMessage($chatId, '🗑️ ادمین حذف شد.', [
                'reply_markup' => $this->adminMenuMarkup($actor),
            ]);

            return;
        }

        if ($action === 'i') {
            $this->renderAdminPermissions($client, $chatId, $messageId, $target);

            return;
        }

        $this->renderAdminsTable($bot, $client, $chatId, $messageId);
    }

    private function renderAdminsTable(
        TelegramBot $bot,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
    ): void {
        $permanentIds = array_map('intval', (array) config('telegram_bot.permanent_admins.telegram_user_ids', []));
        $admins = TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->where(function ($q) use ($permanentIds): void {
                $q->where('is_bot_admin', true);
                if ($permanentIds !== []) {
                    $q->orWhereIn('telegram_user_id', $permanentIds);
                }
            })
            ->orderBy('id')
            ->get();

        $keyboard = [
            [['text' => '➕ افزودن', 'callback_data' => 'admin:admins:add']],
            [
                ['text' => 'نام', 'callback_data' => 'admin:admins:list'],
                ['text' => 'دسترسی ها', 'callback_data' => 'admin:admins:list'],
                ['text' => 'حذف', 'callback_data' => 'admin:admins:list'],
            ],
        ];

        foreach ($admins as $admin) {
            $name = mb_substr($admin->adminDisplayName(), 0, 14);
            $rankMark = $admin->isPermanentBotAdmin() || $admin->isSuperBotAdmin() ? '⭐' : '👤';
            $keyboard[] = [
                ['text' => $rankMark.' '.$name, 'callback_data' => 'admin:admins:perm:'.$admin->id],
                ['text' => '⚙️', 'callback_data' => 'admin:admins:perm:'.$admin->id],
                ['text' => $admin->isPermanentBotAdmin() ? '🔒' : '🗑️', 'callback_data' => $admin->isPermanentBotAdmin()
                    ? 'admin:admins:perm:'.$admin->id
                    : 'admin:admins:del:'.$admin->id],
            ];
        }

        if ($admins->isEmpty()) {
            $keyboard[] = [['text' => 'ادمینی ثبت نشده', 'callback_data' => 'admin:admins:add']];
        }

        $this->editOrSend(
            $client,
            $chatId,
            $messageId,
            '👈 به بخش #ادمین_ها خوش آمدید',
            ['inline_keyboard' => $keyboard],
        );
    }

    private function renderAdminPermissions(
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        TelegramAccount $target,
    ): void {
        $name = $target->adminDisplayName();
        $enabled = $target->botAdminPermissions();
        $keyboard = [];

        foreach (\App\Modules\TelegramBot\Enums\BotAdminPermission::ordered() as $permission) {
            $on = in_array($permission->value, $enabled, true);
            $prefix = $on ? '✅' : '❌';
            $keyboard[] = [[
                'text' => $prefix.' '.$permission->labelFa(),
                'callback_data' => 'admin:admins:t:'.$target->id.':'.$permission->value,
            ]];
        }

        $keyboard[] = [
            ['text' => ($target->isSuperBotAdmin() ? '✅' : '⬜').' ادمین برتر', 'callback_data' => 'admin:admins:rank:'.$target->id.':super'],
            ['text' => ((! $target->isSuperBotAdmin() && $target->isBotAdmin()) ? '✅' : '⬜').' ادمین ساده', 'callback_data' => 'admin:admins:rank:'.$target->id.':simple'],
        ];

        $keyboard[] = [
            ['text' => '◀️ لیست ادمین‌ها', 'callback_data' => 'admin:admins:list'],
            ['text' => '🏠 داشبورد', 'callback_data' => 'admin:h'],
        ];

        $note = $target->isPermanentBotAdmin()
            ? "\n\n⭐ ادمین دائمی — همه دسترسی‌ها همیشه فعال‌اند."
            : "\n\nرده: ".$target->botAdminRankLabel()."\nبرای تغییر هر دسترسی روی آن بزنید.";

        $this->editOrSend(
            $client,
            $chatId,
            $messageId,
            "🔐 دسترسی ادمین « {$name} » به ربات".$note,
            ['inline_keyboard' => $keyboard],
        );
    }

    private function onAdminAddById(
        TelegramBot $bot,
        TelegramAccount $actor,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
    ): void {
        if (app(AdminsSectionKeyboard::class)->isAdd($text)) {
            return;
        }

        $query = trim(ltrim($text, '@'));
        if (! ctype_digit($query)) {
            $client->sendMessage($chatId, 'لطفاً فقط ایدی عددی لاتین بفرستید یا از «➕ افزودن ادمین» استفاده کنید.', [
                'reply_markup' => app(AdminsSectionKeyboard::class)->replyMarkup(),
            ]);

            return;
        }

        $this->beginAdminDisplayNameStep($bot, $actor, $conversation, $client, $chatId, (int) $query);
    }

    private function onAdminAddDisplayName(
        TelegramBot $bot,
        TelegramAccount $actor,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
    ): void {
        $name = trim($text);
        $adminsKeyboard = app(AdminsSectionKeyboard::class);
        if ($name === '' || $adminsKeyboard->isAdd($name) || $adminsKeyboard->isBack($name)) {
            $client->sendMessage($chatId, 'نام نمایشی ادمین را بنویسید (نه عدد خالص).', [
                'reply_markup' => $adminsKeyboard->nameStepReplyMarkup(),
            ]);

            return;
        }

        if (ctype_digit(preg_replace('/\s+/u', '', $name) ?? '')) {
            $client->sendMessage($chatId, 'نام نمایشی نباید فقط عدد باشد. یک نام متنی بفرستید.', [
                'reply_markup' => app(AdminsSectionKeyboard::class)->nameStepReplyMarkup(),
            ]);

            return;
        }

        if (mb_strlen($name) > 40) {
            $client->sendMessage($chatId, 'نام نمایشی حداکثر ۴۰ کاراکتر باشد.', [
                'reply_markup' => app(AdminsSectionKeyboard::class)->nameStepReplyMarkup(),
            ]);

            return;
        }

        $targetId = (int) data_get($conversation->context, 'admin.draft.target_account_id');
        $target = TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->whereKey($targetId)
            ->first();

        if ($target === null) {
            $this->conversations->transition($conversation, ConversationState::AdminPanel, [
                'admin' => ['flow' => null, 'draft' => []],
            ]);
            $client->sendMessage($chatId, 'کاربر پیدا نشد. دوباره از افزودن شروع کنید.', [
                'reply_markup' => $this->adminMenuMarkup($actor),
            ]);

            return;
        }

        if ($target->isBotAdmin()) {
            $this->conversations->transition($conversation, ConversationState::AdminPanel, [
                'admin' => ['flow' => null, 'draft' => []],
            ]);
            $client->sendMessage($chatId, 'این کاربر از قبل ادمین است.', [
                'reply_markup' => $this->adminMenuMarkup($actor),
            ]);
            $this->renderAdminsTable($bot, $client, $chatId, 0);

            return;
        }

        $target->grantAllBotAdminPermissions($name, BotAdminRank::Simple);
        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);
        $this->renderAdminsTable($bot, $client, $chatId, 0);
        $client->sendMessage(
            $chatId,
            '✅ «'.$target->fresh()->adminDisplayName().'» به‌عنوان ادمین ساده با همه دسترسی‌ها اضافه شد. از ⚙️ می‌توانید رده را برتر کنید یا دسترسی‌ها را کم کنید.',
            ['reply_markup' => $this->adminMenuMarkup($actor)],
        );
    }

    /** @param  array<string, mixed>  $message */
    public function handleUsersShared(
        TelegramBot $bot,
        TelegramAccount $actor,
        TelegramConversation $conversation,
        int $chatId,
        array $message,
    ): bool {
        if (! $actor->isBotAdmin()) {
            return false;
        }

        $flow = (string) data_get($conversation->context, 'admin.flow', '');
        if ($conversation->state !== ConversationState::AdminWaitingInput || $flow !== 'admin_add') {
            return false;
        }

        $shared = (array) ($message['users_shared'] ?? []);
        $userIds = $shared['user_ids'] ?? [];
        if (! is_array($userIds) || $userIds === []) {
            return false;
        }

        $telegramUserId = (int) ($userIds[0] ?? 0);
        if ($telegramUserId <= 0) {
            return false;
        }

        $client = $this->clients->forBot($bot);
        $this->beginAdminDisplayNameStep($bot, $actor, $conversation, $client, $chatId, $telegramUserId);

        return true;
    }

    private function beginAdminDisplayNameStep(
        TelegramBot $bot,
        TelegramAccount $actor,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        int $telegramUserId,
    ): void {
        if (! $actor->canManageBotAdmins()) {
            $client->sendMessage($chatId, '⛔ فقط ادمین برتر می‌تواند ادمین اضافه کند.', [
                'reply_markup' => $this->adminMenuMarkup($actor),
            ]);

            return;
        }

        $target = TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('telegram_user_id', $telegramUserId)
            ->first();

        if ($target === null) {
            $client->sendMessage(
                $chatId,
                '❌ این کاربر هنوز ربات را استارت نکرده و عضو ربات نیست. اول باید خودش /start بزند، بعد می‌توانید ادمینش کنید.',
                ['reply_markup' => app(AdminsSectionKeyboard::class)->replyMarkup()],
            );

            return;
        }

        if ($target->isBotAdmin() || $target->isPermanentBotAdmin()) {
            $client->sendMessage($chatId, 'این کاربر از قبل ادمین است.', [
                'reply_markup' => $this->adminMenuMarkup($actor),
            ]);
            $this->conversations->transition($conversation, ConversationState::AdminPanel, [
                'admin' => ['flow' => null, 'draft' => []],
            ]);
            $this->renderAdminsTable($bot, $client, $chatId, 0);

            return;
        }

        $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
            'admin' => [
                'flow' => 'admin_add_name',
                'draft' => ['target_account_id' => $target->id],
            ],
        ]);

        $hint = filled($target->telegram_username)
            ? '@'.$target->telegram_username
            : 'کاربر انتخاب‌شده';

        $client->sendMessage(
            $chatId,
            "✅ {$hint} عضو ربات است.\n\n📝 نام نمایشی این ادمین را بفرستید (مثلاً «پشتیبان ۱»):\nاین نام در لیست ادمین‌ها دیده می‌شود.",
            ['reply_markup' => app(AdminsSectionKeyboard::class)->nameStepReplyMarkup()],
        );
    }

    private function nonAdminUsersQuery(TelegramBot $bot)
    {
        $permanentIds = array_values(array_filter(array_map(
            'intval',
            (array) config('telegram_bot.permanent_admins.telegram_user_ids', []),
        )));

        return TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('is_bot_admin', false)
            ->when($permanentIds !== [], fn ($q) => $q->whereNotIn('telegram_user_id', $permanentIds));
    }

    private function renderUserDetail(
        TelegramBot $bot,
        TelegramAccount $actor,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        TelegramAccount $target,
        bool $fromAdmins = false,
    ): void {
        $text = $this->userStats->formatProfileText($target);
        if ($target->is_blocked) {
            $text .= "\n\n🚫 وضعیت: مسدود";
        }

        $id = $target->id;
        $backCb = $fromAdmins || $target->isBotAdmin() ? 'admin:admins:p:0' : 'admin:u:s';

        $keyboard = [
            [
                ['text' => $target->is_blocked ? '✅ رفع مسدودیت' : '🔒 بلاک کن', 'callback_data' => 'admin:u:b:'.$id],
            ],
            [
                ['text' => '📩 ارسال پیام', 'callback_data' => 'admin:u:msg:'.$id],
            ],
            [
                ['text' => '🏦 پرداخت ها', 'callback_data' => 'admin:u:pay:'.$id],
                ['text' => '📮 اشتراک ها', 'callback_data' => 'admin:u:sub:'.$id],
            ],
            [
                ['text' => '🗃️ اشتراک های زیرمجموعه', 'callback_data' => 'admin:u:refs:'.$id],
                ['text' => '🎯 درصد همکاری', 'callback_data' => 'admin:u:coop:'.$id],
            ],
            [
                ['text' => '👥 کاربران زیرمجموعه', 'callback_data' => 'admin:u:refu:'.$id],
                ['text' => $target->is_bot_admin || $target->isPermanentBotAdmin() ? '⬇️ حذف ادمین' : '⬆️ ادمین بات', 'callback_data' => 'admin:u:a:'.$id],
            ],
            [
                ['text' => '◀️ بازگشت', 'callback_data' => $backCb],
                ['text' => '🏠 داشبورد', 'callback_data' => 'admin:h'],
            ],
        ];

        $this->editOrSend($client, $chatId, $messageId, $text, ['inline_keyboard' => $keyboard], ['parse_mode' => 'HTML']);
        // Keep admin reply keyboard visible at the bottom (like user panel).
        if ($messageId <= 0) {
            $client->sendMessage($chatId, 'منوی پنل ادمین پایین صفحه فعال است.', [
                'reply_markup' => $this->adminMenuMarkup($actor),
            ]);
        }
    }

    private function onDmUser(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
    ): void {
        $targetId = (int) data_get($conversation->context, 'admin.draft.target_account_id');
        $target = TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->whereKey($targetId)
            ->first();

        if ($target === null) {
            throw new RuntimeException('کاربر هدف یافت نشد.');
        }

        $client->sendMessage($target->telegram_user_id, "📩 پیام از پشتیبانی آکادمی:\n\n".$text);
        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);
        $client->sendMessage($chatId, '✅ پیام ارسال شد.', [
            'reply_markup' => $this->adminMenuMarkup($account),
        ]);
    }

    private function renderUserPayments(
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        TelegramAccount $target,
    ): void {
        $orders = \App\Models\Order::query()
            ->where('user_id', $target->user_id)
            ->whereIn('status', ['paid', 'fulfilled'])
            ->orderByDesc('id')
            ->limit(10)
            ->get(['id', 'order_number', 'final_amount', 'status', 'paid_at', 'created_at']);

        $lines = ["🏦 پرداخت‌های کاربر #{$target->telegram_user_id}", ''];
        if ($orders->isEmpty()) {
            $lines[] = 'پرداخت موفقی ثبت نشده است.';
        } else {
            foreach ($orders as $order) {
                $amount = number_format((int) $order->final_amount);
                $lines[] = "• {$order->order_number} — {$amount} تومان ({$order->status})";
            }
        }

        $this->editOrSend($client, $chatId, $messageId, implode("\n", $lines), [
            'inline_keyboard' => [[
                ['text' => '◀️ پروفایل', 'callback_data' => 'admin:u:i:'.$target->id],
                ['text' => '🏠 داشبورد', 'callback_data' => 'admin:h'],
            ]],
        ]);
    }

    private function renderUserSubscriptions(
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        TelegramAccount $target,
    ): void {
        $accesses = \App\Models\CourseAccess::query()
            ->with('product:id,title')
            ->where('user_id', $target->user_id)
            ->orderByDesc('id')
            ->limit(15)
            ->get();

        $lines = ["📮 اشتراک‌های کاربر #{$target->telegram_user_id}", ''];
        if ($accesses->isEmpty()) {
            $lines[] = 'اشتراکی ثبت نشده است.';
        } else {
            foreach ($accesses as $access) {
                $title = $access->product?->title ?? ('محصول #'.$access->product_id);
                $status = $access->status?->value ?? '—';
                $lines[] = "• {$title} — {$status}";
            }
        }

        $this->editOrSend($client, $chatId, $messageId, implode("\n", $lines), [
            'inline_keyboard' => [[
                ['text' => '◀️ پروفایل', 'callback_data' => 'admin:u:i:'.$target->id],
                ['text' => '🏠 داشبورد', 'callback_data' => 'admin:h'],
            ]],
        ]);
    }

    private function renderReferralUsers(
        TelegramBot $bot,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        TelegramAccount $target,
    ): void {
        $userId = $target->user_id;
        $code = $target->user?->referralCode?->code;

        $query = TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->where(function ($q) use ($userId, $code): void {
                if ($userId) {
                    $q->where('metadata->referred_by_user_id', $userId);
                }
                if (is_string($code) && $code !== '') {
                    $method = $userId ? 'orWhere' : 'where';
                    $q->{$method}('metadata->referred_by_code', $code);
                }
                if (! $userId && (! is_string($code) || $code === '')) {
                    $q->whereRaw('1 = 0');
                }
            })
            ->orderByDesc('id')
            ->limit(20)
            ->get();

        $lines = ["👥 کاربران زیرمجموعه #{$target->telegram_user_id}", ''];
        if ($query->isEmpty()) {
            $lines[] = 'زیرمجموعه‌ای از طریق ربات ثبت نشده است.';
        } else {
            foreach ($query as $item) {
                $lines[] = '• '.$this->accountLabel($item)." (TG: {$item->telegram_user_id})";
            }
        }

        $this->editOrSend($client, $chatId, $messageId, implode("\n", $lines), [
            'inline_keyboard' => [[
                ['text' => '◀️ پروفایل', 'callback_data' => 'admin:u:i:'.$target->id],
                ['text' => '🏠 داشبورد', 'callback_data' => 'admin:h'],
            ]],
        ]);
    }

    private function renderReferralSubscriptions(
        TelegramBot $bot,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        TelegramAccount $target,
    ): void {
        $code = $target->user?->referralCode?->code;
        $buyerIds = collect();
        if ($target->user_id) {
            $buyerIds = $buyerIds->merge(
                \App\Models\ReferralConversion::query()
                    ->where('referrer_user_id', $target->user_id)
                    ->pluck('buyer_user_id')
            );
        }
        if (is_string($code) && $code !== '') {
            $buyerIds = $buyerIds->merge(
                \App\Models\Order::query()
                    ->where('referral_code', $code)
                    ->whereIn('status', ['paid', 'fulfilled'])
                    ->pluck('user_id')
            );
        }
        $buyerIds = $buyerIds->filter()->unique()->values();

        $lines = ["🗃️ اشتراک‌های زیرمجموعه #{$target->telegram_user_id}", ''];
        if ($buyerIds->isEmpty()) {
            $lines[] = 'اشتراک فعالی برای زیرمجموعه‌ها یافت نشد.';
        } else {
            $accesses = \App\Models\CourseAccess::query()
                ->with('product:id,title')
                ->whereIn('user_id', $buyerIds->all())
                ->where('status', \App\Enums\CourseAccessStatus::Active)
                ->orderByDesc('id')
                ->limit(20)
                ->get();
            if ($accesses->isEmpty()) {
                $lines[] = 'اشتراک فعالی برای زیرمجموعه‌ها یافت نشد.';
            } else {
                foreach ($accesses as $access) {
                    $title = $access->product?->title ?? ('محصول #'.$access->product_id);
                    $lines[] = "• user#{$access->user_id} — {$title}";
                }
            }
        }

        $this->editOrSend($client, $chatId, $messageId, implode("\n", $lines), [
            'inline_keyboard' => [[
                ['text' => '◀️ پروفایل', 'callback_data' => 'admin:u:i:'.$target->id],
                ['text' => '🏠 داشبورد', 'callback_data' => 'admin:h'],
            ]],
        ]);
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
        $action = $parts[2] ?? 'q';

        if (in_array($action, ['p', 'q'], true)) {
            $this->startBroadcastFlow($bot, $account, $client, $chatId);

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
            default => $this->startBroadcastFlow($bot, $account, $client, $chatId),
        };
    }

    private function startBroadcastFlow(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
    ): void {
        $conversation = $this->conversations->forAccount($account);
        $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
            'admin' => ['flow' => 'broadcast_quick', 'draft' => []],
        ]);

        $client->sendMessage(
            $chatId,
            "📣 پیام همگانی\n\nمتن پیام را بنویسید (یا «لغو»):",
            ['reply_markup' => $this->adminMenuMarkup($account)],
        );
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

        $audienceEstimate = $bot
            ? $this->audienceSegments->count((int) $bot->id, $broadcast->segment_key)
            : null;
        $segmentLabel = $this->audienceSegments->label((string) ($broadcast->segment_key ?: 'all_bot_users'));

        $text = ($notice ? $notice."\n\n" : '')
            ."📣 #{$broadcast->id} · {$broadcast->title}\n"
            .'وضعیت: '.$this->broadcastStatusLabel((string) $broadcast->status)."\n"
            ."گروه مخاطب: {$segmentLabel}\n"
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
            ['text' => '🏠 داشبورد', 'callback_data' => 'admin:h'],
        ];

        $this->editOrSend($client, $chatId, $messageId, $text, ['inline_keyboard' => $keyboard]);
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

        $this->promptBroadcastSegment($bot, $account, $conversation, $client, $chatId, [
            'title' => 'پیام '.now()->format('Y-m-d H:i'),
            'text' => mb_substr($body, 0, 4000),
        ]);
    }

    private function handleBroadcastSegmentPick(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        string $data,
    ): void {
        $segmentKey = substr($data, strlen('admin:b:sg:'));
        $conversation = $this->conversations->forAccount($account);
        $draft = (array) data_get($conversation->context, 'admin.draft', []);

        if (($conversation->context['admin']['flow'] ?? '') !== 'broadcast_segment') {
            throw new RuntimeException('مرحله انتخاب مخاطب منقضی شده. دوباره پیام همگانی بسازید.');
        }

        $this->finalizeBroadcastWithSegment($bot, $account, $client, $chatId, $segmentKey, $draft);
    }

    private function sendBroadcastPreview(
        TelegramBot $bot,
        TelegramBotClientInterface $client,
        int $chatId,
        TelegramBroadcast $broadcast,
        ?string $prefix = null,
    ): void {
        $segmentLabel = $this->audienceSegments->label((string) ($broadcast->segment_key ?: 'all_bot_users'));
        $audience = (int) ($broadcast->audience_count ?: $this->audienceSegments->count((int) $bot->id, $broadcast->segment_key));
        $body = (string) data_get($broadcast->content, 'text', '');

        $message = ($prefix ? $prefix."\n\n" : '')
            ."📣 پیش‌نمایش\n"
            ."گروه: {$segmentLabel}\n"
            ."تعداد: {$audience}\n\n"
            .mb_substr($body, 0, 3500);

        $client->sendMessage($chatId, $message, [
            'reply_markup' => [
                'inline_keyboard' => [
                    [
                        ['text' => '🚀 ارسال', 'callback_data' => 'admin:b:sn:'.$broadcast->id],
                    ],
                    [
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
            $notice."\n\nپیام #{$sent->id} در صف ارسال قرار گرفت.",
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
        if (! $account->hasBotAdminPermission(\App\Modules\TelegramBot\Enums\BotAdminPermission::ForcedJoin)
            && ! $account->isPermanentBotAdmin()) {
            throw new RuntimeException('دسترسی «جوین اجباری» لازم است.');
        }

        $parts = explode(':', $data);
        $action = $parts[2] ?? 'p';

        if ($action === 'noop') {
            return;
        }

        if ($action === 'p' || $action === 'list') {
            $this->renderRequiredChatsList($bot, $client, $chatId, $messageId);

            return;
        }

        if ($action === 'add') {
            $conversation = $this->conversations->forAccount($account);
            $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
                'admin' => ['flow' => 'rc_add', 'draft' => []],
            ]);
            $client->sendMessage(
                $chatId,
                "➕ افزودن کانال اجباری\n\n"
                ."۱) ربات را در کانال ادمین کنید (حداقل دسترسی دیدن اعضا).\n"
                ."۲) یکی از این‌ها را بفرستید:\n"
                ."• یک پست از کانال را همین‌جا فوروارد کنید\n"
                ."• یا @یوزرنیم / آیدی عددی / لینک t.me\n\n"
                .'برای انصراف «لغو» بفرستید.',
                ['reply_markup' => [
                    'keyboard' => [
                        [[
                            'text' => '📢 انتخاب کانال',
                            'request_chat' => [
                                'request_id' => 2001,
                                'chat_is_channel' => true,
                                'bot_is_member' => true,
                            ],
                        ]],
                        [['text' => 'لغو']],
                    ],
                    'resize_keyboard' => true,
                ]],
            );

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

        if ($action === 'del') {
            $title = $requiredChat->title;
            $requiredChat->delete();
            $this->renderRequiredChatsList($bot, $client, $chatId, $messageId, "🗑️ «{$title}» حذف شد.");

            return;
        }

        if ($action === 'rn') {
            $conversation = $this->conversations->forAccount($account);
            $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
                'admin' => [
                    'flow' => 'rc_rename',
                    'draft' => ['required_chat_id' => $requiredChat->id],
                ],
            ]);
            $client->sendMessage(
                $chatId,
                "✍️ نام نمایشی جدید برای «{$requiredChat->title}» را بفرستید:\n(یا «لغو»)",
                ['reply_markup' => $this->adminMenuMarkup($account)],
            );

            return;
        }

        if ($action === 't') {
            $requiredChat->update(['is_active' => ! $requiredChat->is_active]);
            $this->renderRequiredChatsList($bot, $client, $chatId, $messageId, 'وضعیت فعال بودن به‌روز شد.');

            return;
        }

        if ($action === 'r') {
            $requiredChat->update(['is_required' => ! $requiredChat->is_required]);
            $this->renderRequiredChatsList($bot, $client, $chatId, $messageId, 'وضعیت اجباری بودن به‌روز شد.');

            return;
        }

        if ($action === 'i') {
            $this->renderRequiredChatDetail($client, $chatId, $messageId, $requiredChat);

            return;
        }

        $this->renderRequiredChatsList($bot, $client, $chatId, $messageId);
    }

    private function renderRequiredChatsList(
        TelegramBot $bot,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        ?string $notice = null,
    ): void {
        $items = TelegramRequiredChat::query()
            ->where('telegram_bot_id', $bot->id)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $text = ($notice ? $notice."\n\n" : '')
            .'👈 به بخش جوین اجباری خوش آمدید';

        $keyboard = [
            [['text' => '➕ افزودن', 'callback_data' => 'admin:rc:add']],
            [
                ['text' => 'حذف', 'callback_data' => 'admin:rc:noop'],
                ['text' => 'تغییر نام', 'callback_data' => 'admin:rc:noop'],
                ['text' => 'ورود', 'callback_data' => 'admin:rc:noop'],
            ],
        ];

        foreach ($items as $item) {
            $title = mb_substr((string) $item->title, 0, 28);
            if ($title === '') {
                $title = 'بدون نام';
            }
            $enterLabel = '↗️ '.$title;
            $enterButton = filled($item->invite_link)
                ? ['text' => $enterLabel, 'url' => (string) $item->invite_link]
                : ['text' => $enterLabel, 'callback_data' => 'admin:rc:i:'.$item->id];

            $keyboard[] = [
                ['text' => '🗑️', 'callback_data' => 'admin:rc:del:'.$item->id],
                ['text' => '✍️', 'callback_data' => 'admin:rc:rn:'.$item->id],
                $enterButton,
            ];
        }

        if ($items->isEmpty()) {
            $keyboard[] = [['text' => 'کانالی ثبت نشده — افزودن را بزنید', 'callback_data' => 'admin:rc:add']];
        }

        $keyboard[] = [['text' => '🏠 داشبورد', 'callback_data' => 'admin:h']];

        $this->editOrSend($client, $chatId, $messageId, $text, ['inline_keyboard' => $keyboard]);
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
            .($requiredChat->invite_link ? "لینک: {$requiredChat->invite_link}" : 'لینک: —');

        $keyboard = [];
        if (filled($requiredChat->invite_link)) {
            $keyboard[] = [['text' => '↗️ ورود به کانال', 'url' => (string) $requiredChat->invite_link]];
        }
        $keyboard[] = [
            ['text' => $requiredChat->is_active ? '⛔ غیرفعال' : '✅ فعال', 'callback_data' => 'admin:rc:t:'.$requiredChat->id],
            ['text' => $requiredChat->is_required ? 'اختیاری کن' : 'اجباری کن', 'callback_data' => 'admin:rc:r:'.$requiredChat->id],
        ];
        $keyboard[] = [
            ['text' => '✍️ تغییر نام', 'callback_data' => 'admin:rc:rn:'.$requiredChat->id],
            ['text' => '🗑️ حذف', 'callback_data' => 'admin:rc:del:'.$requiredChat->id],
        ];
        $keyboard[] = [
            ['text' => '◀️ لیست', 'callback_data' => 'admin:rc:list'],
            ['text' => '🏠 داشبورد', 'callback_data' => 'admin:h'],
        ];

        $this->editOrSend($client, $chatId, $messageId, $text, ['inline_keyboard' => $keyboard]);
    }

    private function onRequiredChatAddInput(
        TelegramBot $bot,
        TelegramAccount $actor,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
    ): void {
        if (trim($text) === '📢 انتخاب کانال') {
            return;
        }

        $this->registerRequiredChatFromIdentifier($bot, $actor, $conversation, $client, $chatId, trim($text));
    }

    private function onRequiredChatRenameInput(
        TelegramBot $bot,
        TelegramAccount $actor,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
    ): void {
        $name = trim($text);
        if ($name === '' || mb_strlen($name) > 80) {
            $client->sendMessage($chatId, 'نام معتبر بفرستید (۱ تا ۸۰ کاراکتر).');

            return;
        }

        $id = (int) data_get($conversation->context, 'admin.draft.required_chat_id');
        $requiredChat = TelegramRequiredChat::query()
            ->where('telegram_bot_id', $bot->id)
            ->whereKey($id)
            ->first();

        if ($requiredChat === null) {
            $this->conversations->transition($conversation, ConversationState::AdminPanel, [
                'admin' => ['flow' => null, 'draft' => []],
            ]);
            $client->sendMessage($chatId, 'کانال پیدا نشد.', [
                'reply_markup' => $this->adminMenuMarkup($actor),
            ]);

            return;
        }

        $requiredChat->update(['title' => $name]);
        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);
        $client->sendMessage($chatId, '✅ نام به‌روز شد.', [
            'reply_markup' => $this->adminMenuMarkup($actor),
        ]);
        $this->renderRequiredChatsList($bot, $client, $chatId, 0);
    }

    /** @param  array<string, mixed>  $message */
    public function handleRequiredChatShareOrForward(
        TelegramBot $bot,
        TelegramAccount $actor,
        TelegramConversation $conversation,
        int $chatId,
        array $message,
    ): bool {
        if (! $actor->isBotAdmin()) {
            return false;
        }

        $flow = (string) data_get($conversation->context, 'admin.flow', '');
        if ($conversation->state !== ConversationState::AdminWaitingInput
            || ! in_array($flow, ['rc_add', 'dest_add'], true)) {
            return false;
        }

        $client = $this->clients->forBot($bot);
        $identifier = null;

        if (isset($message['chat_shared'])) {
            $sharedId = (int) data_get($message, 'chat_shared.chat_id', 0);
            if ($sharedId !== 0) {
                $identifier = (string) $sharedId;
            }
        }

        if ($identifier === null) {
            $forwardChat = (array) ($message['forward_from_chat'] ?? []);
            if ($forwardChat !== []) {
                $identifier = (string) ($forwardChat['id'] ?? '');
                if ($identifier === '' && filled($forwardChat['username'] ?? null)) {
                    $identifier = '@'.$forwardChat['username'];
                }
            }
        }

        if ($identifier === null) {
            $origin = (array) ($message['forward_origin'] ?? []);
            if (($origin['type'] ?? '') === 'channel') {
                $originChat = (array) ($origin['chat'] ?? []);
                $identifier = (string) ($originChat['id'] ?? '');
                if ($identifier === '' && filled($originChat['username'] ?? null)) {
                    $identifier = '@'.$originChat['username'];
                }
            }
        }

        if ($identifier === null || $identifier === '' || $identifier === '0') {
            return false;
        }

        if ($flow === 'dest_add') {
            $this->registerDestinationFromIdentifier($bot, $actor, $conversation, $client, $chatId, $identifier, $message);
        } else {
            $this->registerRequiredChatFromIdentifier($bot, $actor, $conversation, $client, $chatId, $identifier, $message);
        }

        return true;
    }

    /** @param  array<string, mixed>|null  $sourceMessage */
    private function registerRequiredChatFromIdentifier(
        TelegramBot $bot,
        TelegramAccount $actor,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $raw,
        ?array $sourceMessage = null,
    ): void {
        $raw = trim($raw);
        $inviteHint = null;
        if (preg_match('~(?:https?://)?(?:www\.)?t\.me/~i', $raw)) {
            $inviteHint = $raw;
        }

        try {
            $resolvedId = $this->requiredChats->resolveAndSyncChatId($bot, $raw, $inviteHint);
            $this->assertBotIsChannelAdmin($bot, $client, $resolvedId);

            $chatInfo = [];
            try {
                $chatInfo = $client->getChat($resolvedId);
            } catch (Throwable) {
                $chatInfo = [];
            }

            $title = (string) ($chatInfo['title'] ?? data_get($sourceMessage, 'forward_from_chat.title') ?? '');
            if ($title === '') {
                $title = (string) ($chatInfo['username'] ?? $resolvedId);
            }

            $inviteLink = $inviteHint;
            if (blank($inviteLink) && filled($chatInfo['username'] ?? null)) {
                $inviteLink = 'https://t.me/'.$chatInfo['username'];
            }
            if (blank($inviteLink) && filled($chatInfo['invite_link'] ?? null)) {
                $inviteLink = (string) $chatInfo['invite_link'];
            }
            if (blank($inviteLink)) {
                try {
                    $created = $client->createChatInviteLink($resolvedId, [
                        'name' => 'bot-required-join',
                    ]);
                    $inviteLink = (string) ($created['invite_link'] ?? '');
                } catch (Throwable) {
                    $inviteLink = null;
                }
            }

            $existing = TelegramRequiredChat::query()
                ->where('telegram_bot_id', $bot->id)
                ->where('chat_id', $resolvedId)
                ->first();

            if ($existing !== null) {
                $existing->update([
                    'title' => $title,
                    'invite_link' => $inviteLink ?: $existing->invite_link,
                    'is_active' => true,
                    'is_required' => true,
                ]);
                $saved = $existing;
                $notice = '✅ کانال از قبل بود و به‌روز شد: '.$title;
            } else {
                $maxSort = (int) TelegramRequiredChat::query()
                    ->where('telegram_bot_id', $bot->id)
                    ->max('sort_order');
                $saved = TelegramRequiredChat::query()->create([
                    'telegram_bot_id' => $bot->id,
                    'chat_id' => $resolvedId,
                    'title' => $title,
                    'invite_link' => $inviteLink,
                    'is_required' => true,
                    'is_active' => true,
                    'sort_order' => $maxSort + 1,
                ]);
                $notice = '✅ کانال اجباری ثبت شد: '.$title;
            }
        } catch (Throwable $e) {
            $client->sendMessage(
                $chatId,
                '❌ ثبت کانال ناموفق بود:'."\n".$e->getMessage()."\n\n"
                .'مطمئن شوید ربات در کانال ادمین است و دوباره فوروارد/@یوزرنیم/لینک بفرستید.',
            );

            return;
        }

        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);
        $client->sendMessage($chatId, $notice, [
            'reply_markup' => $this->adminMenuMarkup($actor),
        ]);
        $this->renderRequiredChatsList($bot, $client, $chatId, 0);
        unset($saved);
    }

    private function assertBotIsChannelAdmin(
        TelegramBot $bot,
        TelegramBotClientInterface $client,
        string $resolvedChatId,
    ): void {
        if (config('bahram.otp.dev_mode') && app()->environment('local', 'testing')) {
            return;
        }

        try {
            $client->getChatAdministrators($resolvedChatId);
        } catch (Throwable $e) {
            if (str_contains($e->getMessage(), 'member list is inaccessible')
                || str_contains($e->getMessage(), 'chat not found')
                || str_contains($e->getMessage(), 'bot is not a member')) {
                throw new RuntimeException(
                    'ربات باید در این کانال ادمین باشد تا بتواند عضویت کاربران را بررسی کند.',
                );
            }

            throw new RuntimeException('شناسه کانال معتبر نیست یا ربات به آن دسترسی ندارد: '.$e->getMessage());
        }
    }

    private function handleDestinationsCallback(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        string $data,
    ): void {
        if (! $account->hasBotAdminPermission(\App\Modules\TelegramBot\Enums\BotAdminPermission::Menus)
            && ! $account->isPermanentBotAdmin()) {
            throw new RuntimeException('دسترسی «منو ها» برای مدیریت مقاصد لازم است.');
        }

        $parts = explode(':', $data);
        $action = $parts[2] ?? 'list';

        if ($action === 'noop') {
            return;
        }

        if ($action === 'p' || $action === 'list') {
            $this->renderDestinationsList($bot, $client, $chatId, $messageId);

            return;
        }

        if ($action === 'add') {
            $conversation = $this->conversations->forAccount($account);
            $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
                'admin' => ['flow' => 'dest_add', 'draft' => []],
            ]);
            $client->sendMessage(
                $chatId,
                "➕ افزودن گروه پشتیبانی محصول\n\n"
                ."۱) ربات را داخل گروه ادمین کنید\n"
                ."   (تأیید درخواست عضویت + ساخت لینک دعوت).\n\n"
                ."۲) Chat ID گروه را بفرستید.\n"
                ."مثال: `-1003623149563`\n\n"
                ."۳) بعد از ثبت، شرط دسترسی را انتخاب می‌کنید:\n"
                ."   • محصول (مثلاً کمپین‌نویسی)\n"
                ."   • یا «عضویت فعال سات» برای گروه سات\n"
                ."ربات خودش لینک عضویت را به کاربران مجاز می‌دهد.\n\n"
                .'برای انصراف «لغو» بفرستید.',
                [
                    'parse_mode' => 'Markdown',
                    'reply_markup' => [
                        'keyboard' => [[['text' => 'لغو']]],
                        'resize_keyboard' => true,
                    ],
                ],
            );

            return;
        }

        if ($action === 'reqset') {
            $destinationId = (int) ($parts[3] ?? 0);
            $token = (string) ($parts[4] ?? '');
            $destination = TelegramDestination::query()
                ->where('telegram_bot_id', $bot->id)
                ->whereKey($destinationId)
                ->first();
            if ($destination === null || $token === '') {
                throw new RuntimeException('مقصد یا شرط دسترسی نامعتبر است.');
            }

            if ($token === 'sat') {
                $destination->requirements()->delete();
                $destination->requirements()->create([
                    'requirement_type' => 'sat_membership',
                    'requirement_value' => 'active',
                    'group_key' => 'default',
                    'operator' => 'all',
                ]);
                $this->renderDestinationDetail(
                    $client,
                    $chatId,
                    $messageId,
                    $destination->fresh(['requirements']),
                    '✅ شرط دسترسی: عضویت فعال سات',
                );

                return;
            }

            $productId = (int) $token;
            if ($productId <= 0) {
                throw new RuntimeException('مقصد یا محصول نامعتبر است.');
            }
            $product = \App\Models\Product::query()->whereKey($productId)->first();
            if ($product === null) {
                throw new RuntimeException('محصول یافت نشد.');
            }
            $destination->requirements()->delete();
            $destination->requirements()->create([
                'requirement_type' => 'active_course_access',
                'requirement_value' => (string) $product->id,
                'group_key' => 'default',
                'operator' => 'all',
            ]);
            $this->renderDestinationDetail($client, $chatId, $messageId, $destination->fresh(['requirements']), '✅ شرط دسترسی: '.$product->title);

            return;
        }

        $destinationId = (int) ($parts[3] ?? 0);
        $destination = TelegramDestination::query()
            ->where('telegram_bot_id', $bot->id)
            ->whereKey($destinationId)
            ->with('requirements')
            ->first();

        if ($destination === null) {
            throw new RuntimeException('مقصد یافت نشد.');
        }

        if ($action === 'del') {
            $title = $destination->title;
            $destination->requirements()->delete();
            $destination->delete();
            $this->renderDestinationsList($bot, $client, $chatId, $messageId, "🗑️ «{$title}» حذف شد.");

            return;
        }

        if ($action === 'rn') {
            $conversation = $this->conversations->forAccount($account);
            $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
                'admin' => [
                    'flow' => 'dest_rename',
                    'draft' => ['destination_id' => $destination->id],
                ],
            ]);
            $client->sendMessage(
                $chatId,
                "✍️ نام نمایشی جدید برای «{$destination->title}» را بفرستید:\n(یا «لغو»)",
                ['reply_markup' => $this->adminMenuMarkup($account)],
            );

            return;
        }

        if ($action === 't') {
            $destination->update(['is_active' => ! $destination->is_active]);
            $this->renderDestinationsList($bot, $client, $chatId, $messageId, 'وضعیت مقصد به‌روز شد.');

            return;
        }

        if ($action === 'req') {
            $this->renderDestinationRequirementPicker($client, $chatId, $messageId, $destination);

            return;
        }

        if ($action === 'reqclear') {
            $destination->requirements()->delete();
            $this->renderDestinationDetail($client, $chatId, $messageId, $destination->fresh(['requirements']), 'شرط‌های دسترسی پاک شد.');

            return;
        }

        if ($action === 'mode') {
            $mode = (string) ($parts[4] ?? 'per_user');
            $destination->update([
                'access_mode' => $mode === 'shared' ? 'join_request' : 'per_user',
            ]);
            $label = $mode === 'shared' ? 'لینک مشترک' : 'لینک اختصاصی';
            $this->renderDestinationDetail($client, $chatId, $messageId, $destination->fresh(['requirements']), 'نوع لینک: '.$label);

            return;
        }

        if ($action === 'i') {
            $this->renderDestinationDetail($client, $chatId, $messageId, $destination);

            return;
        }

        $this->renderDestinationsList($bot, $client, $chatId, $messageId);
    }

    private function renderDestinationsList(
        TelegramBot $bot,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        ?string $notice = null,
    ): void {
        $items = TelegramDestination::query()
            ->where('telegram_bot_id', $bot->id)
            ->withCount('requirements')
            ->orderByDesc('id')
            ->get();

        $text = ($notice ? $notice."\n\n" : '')
            ."👈 گروه‌های پشتیبانی محصول\n\n"
            .'مقصد = گروه خصوصی با شرط دسترسی (خریدار محصول یا عضو سات). ربات لینک عضویت را خودش می‌سازد.';

        $keyboard = [
            [['text' => '➕ افزودن', 'callback_data' => 'admin:d:add']],
            [
                ['text' => 'حذف', 'callback_data' => 'admin:d:noop'],
                ['text' => 'تغییر نام', 'callback_data' => 'admin:d:noop'],
                ['text' => 'ورود', 'callback_data' => 'admin:d:noop'],
            ],
        ];

        foreach ($items as $item) {
            $title = mb_substr((string) $item->title, 0, 26);
            if ($title === '') {
                $title = 'بدون نام';
            }
            $prefix = $item->is_active ? '' : '⛔ ';
            $enterLabel = '↗️ '.$prefix.$title;
            $enterButton = filled($item->join_request_url)
                ? ['text' => $enterLabel, 'url' => (string) $item->join_request_url]
                : ['text' => $enterLabel, 'callback_data' => 'admin:d:i:'.$item->id];

            $keyboard[] = [
                ['text' => '🗑️', 'callback_data' => 'admin:d:del:'.$item->id],
                ['text' => '✍️', 'callback_data' => 'admin:d:rn:'.$item->id],
                $enterButton,
            ];
        }

        if ($items->isEmpty()) {
            $keyboard[] = [['text' => 'مقصدی ثبت نشده — افزودن را بزنید', 'callback_data' => 'admin:d:add']];
        }

        $keyboard[] = [['text' => '🏠 داشبورد', 'callback_data' => 'admin:h']];

        $this->editOrSend($client, $chatId, $messageId, $text, ['inline_keyboard' => $keyboard]);
    }

    private function renderDestinationDetail(
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        TelegramDestination $destination,
        ?string $notice = null,
    ): void {
        $destination->loadMissing('requirements');
        $reqLines = [];
        foreach ($destination->requirements as $req) {
            $reqLines[] = '• '.$this->formatDestinationRequirementLabel($req);
        }
        if ($reqLines === []) {
            $reqLines[] = '• هنوز شرطی تنظیم نشده (درخواست‌ها رد می‌شوند).';
        }

        $modeLabel = $destination->usesPerUserInvites()
            ? 'لینک اختصاصی هر کاربر (بعد از عضویت حذف می‌شود)'
            : 'لینک مشترک (فقط اکانت مجاز تأیید می‌شود)';

        $text = ($notice ? $notice."\n\n" : '')
            ."📍 #{$destination->id} · {$destination->title}\n"
            ."chat_id: {$destination->chat_id}\n"
            .'فعال: '.($destination->is_active ? 'بله' : 'خیر')."\n"
            ."نوع لینک: {$modeLabel}\n"
            .($destination->join_request_url ? "لینک پشتیبان: {$destination->join_request_url}\n" : "لینک: ربات هنگام درخواست کاربر می‌سازد\n")
            ."\nشرایط دسترسی:\n".implode("\n", $reqLines);

        $keyboard = [];
        $keyboard[] = [
            ['text' => '🔐 لینک اختصاصی', 'callback_data' => 'admin:d:mode:'.$destination->id.':per_user'],
            ['text' => '🔗 لینک مشترک', 'callback_data' => 'admin:d:mode:'.$destination->id.':shared'],
        ];
        if (filled($destination->join_request_url)) {
            $keyboard[] = [['text' => '↗️ لینک پشتیبان گروه', 'url' => (string) $destination->join_request_url]];
        }
        $keyboard[] = [
            ['text' => $destination->is_active ? '⛔ غیرفعال' : '✅ فعال', 'callback_data' => 'admin:d:t:'.$destination->id],
            ['text' => '🎯 شرط دسترسی', 'callback_data' => 'admin:d:req:'.$destination->id],
        ];
        $keyboard[] = [
            ['text' => '✍️ تغییر نام', 'callback_data' => 'admin:d:rn:'.$destination->id],
            ['text' => '🗑️ حذف', 'callback_data' => 'admin:d:del:'.$destination->id],
        ];
        $keyboard[] = [
            ['text' => '◀️ لیست', 'callback_data' => 'admin:d:list'],
            ['text' => '🏠 داشبورد', 'callback_data' => 'admin:h'],
        ];

        $this->editOrSend($client, $chatId, $messageId, $text, ['inline_keyboard' => $keyboard]);
    }

    private function renderDestinationRequirementPicker(
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        TelegramDestination $destination,
    ): void {
        $products = \App\Models\Product::query()
            ->where('is_active', true)
            ->orderByDesc('id')
            ->limit(20)
            ->get(['id', 'title']);

        $text = "🎯 شرط دسترسی برای «{$destination->title}»\n\n"
            ."یکی از گزینه‌ها را انتخاب کنید:\n"
            ."• عضویت فعال سات → برای گروه پشتیبانی سات\n"
            .'• محصول → فقط خریداران همان دوره';

        $keyboard = [];
        $keyboard[] = [[
            'text' => '📚 عضویت فعال سات',
            'callback_data' => 'admin:d:reqset:'.$destination->id.':sat',
        ]];
        foreach ($products as $product) {
            $label = mb_substr('#'.$product->id.' '.$product->title, 0, 40);
            $keyboard[] = [[
                'text' => $label,
                'callback_data' => 'admin:d:reqset:'.$destination->id.':'.$product->id,
            ]];
        }

        if ($products->isEmpty()) {
            $keyboard[] = [['text' => 'محصول فعالی نیست', 'callback_data' => 'admin:d:i:'.$destination->id]];
        }

        $keyboard[] = [
            ['text' => '🧹 پاک کردن شرط‌ها', 'callback_data' => 'admin:d:reqclear:'.$destination->id],
        ];
        $keyboard[] = [
            ['text' => '◀️ جزئیات', 'callback_data' => 'admin:d:i:'.$destination->id],
            ['text' => '🏠 داشبورد', 'callback_data' => 'admin:h'],
        ];

        $this->editOrSend($client, $chatId, $messageId, $text, ['inline_keyboard' => $keyboard]);
    }

    private function onDestinationAddInput(
        TelegramBot $bot,
        TelegramAccount $actor,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
    ): void {
        $raw = trim(str_replace(['`', ' ', "\u{200c}"], '', $text));

        // Accept numeric Telegram chat ids: -1003623149563
        if (! preg_match('/^-100\d{5,}$/', $raw) && ! preg_match('/^-\d{8,}$/', $raw)) {
            $client->sendMessage(
                $chatId,
                "لطفاً فقط آیدی عددی گروه را بفرستید.\n"
                ."مثال درست:\n`-1003623149563`\n\n"
                .'اول ربات را در گروه ادمین کنید، بعد همین آیدی را بفرستید.',
                ['parse_mode' => 'Markdown'],
            );

            return;
        }

        $this->registerDestinationFromIdentifier($bot, $actor, $conversation, $client, $chatId, $raw);
    }

    private function onDestinationRenameInput(
        TelegramBot $bot,
        TelegramAccount $actor,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
    ): void {
        $name = trim($text);
        if ($name === '' || mb_strlen($name) > 80) {
            $client->sendMessage($chatId, 'نام معتبر بفرستید (۱ تا ۸۰ کاراکتر).');

            return;
        }

        $id = (int) data_get($conversation->context, 'admin.draft.destination_id');
        $destination = TelegramDestination::query()
            ->where('telegram_bot_id', $bot->id)
            ->whereKey($id)
            ->first();

        if ($destination === null) {
            $this->conversations->transition($conversation, ConversationState::AdminPanel, [
                'admin' => ['flow' => null, 'draft' => []],
            ]);
            $client->sendMessage($chatId, 'مقصد پیدا نشد.', [
                'reply_markup' => $this->adminMenuMarkup($actor),
            ]);

            return;
        }

        $destination->update(['title' => $name]);
        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);
        $client->sendMessage($chatId, '✅ نام به‌روز شد.', [
            'reply_markup' => $this->adminMenuMarkup($actor),
        ]);
        $this->renderDestinationsList($bot, $client, $chatId, 0);
    }

    /** @param  array<string, mixed>|null  $sourceMessage */
    private function registerDestinationFromIdentifier(
        TelegramBot $bot,
        TelegramAccount $actor,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $raw,
        ?array $sourceMessage = null,
    ): void {
        $raw = trim($raw);
        $inviteHint = null;
        if (preg_match('~(?:https?://)?(?:www\.)?t\.me/~i', $raw)) {
            $inviteHint = $raw;
        }

        try {
            $resolvedId = $this->requiredChats->resolveAndSyncChatId($bot, $raw, $inviteHint);
            $this->assertBotIsChannelAdmin($bot, $client, $resolvedId);

            $chatInfo = [];
            try {
                $chatInfo = $client->getChat($resolvedId);
            } catch (Throwable) {
                $chatInfo = [];
            }

            $title = (string) ($chatInfo['title'] ?? data_get($sourceMessage, 'forward_from_chat.title') ?? '');
            if ($title === '') {
                $title = (string) ($chatInfo['username'] ?? $resolvedId);
            }

            $username = filled($chatInfo['username'] ?? null) ? (string) $chatInfo['username'] : null;
            $chatType = (string) ($chatInfo['type'] ?? 'channel');

            $joinUrl = $inviteHint;
            if (blank($joinUrl) && $username) {
                $joinUrl = 'https://t.me/'.$username;
            }
            if (blank($joinUrl)) {
                try {
                    $created = $client->createChatInviteLink($resolvedId, [
                        'name' => 'bot-destination',
                        'creates_join_request' => true,
                    ]);
                    $joinUrl = (string) ($created['invite_link'] ?? '');
                } catch (Throwable) {
                    $joinUrl = null;
                }
            }

            $existing = TelegramDestination::query()
                ->where('telegram_bot_id', $bot->id)
                ->where('chat_id', $resolvedId)
                ->first();

            if ($existing !== null) {
                $existing->update([
                    'title' => $title,
                    'username' => $username,
                    'chat_type' => $chatType,
                    'join_request_url' => $joinUrl ?: $existing->join_request_url,
                    'is_active' => true,
                    'access_mode' => $existing->access_mode ?: 'per_user',
                ]);
                $saved = $existing;
                $notice = '✅ مقصد از قبل بود و به‌روز شد: '.$title;
            } else {
                $saved = TelegramDestination::query()->create([
                    'telegram_bot_id' => $bot->id,
                    'title' => $title,
                    'chat_id' => $resolvedId,
                    'chat_type' => $chatType,
                    'username' => $username,
                    'join_request_url' => $joinUrl,
                    'access_mode' => 'per_user',
                    'is_active' => true,
                    'welcome_inside_chat' => false,
                ]);
                $notice = '✅ مقصد ثبت شد: '.$title;
            }
        } catch (Throwable $e) {
            $client->sendMessage(
                $chatId,
                '❌ ثبت مقصد ناموفق بود:'."\n".$e->getMessage()."\n\n"
                .'ربات باید در کانال ادمین باشد و بتواند درخواست عضویت را مدیریت کند.',
            );

            return;
        }

        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);
        $client->sendMessage($chatId, $notice."\n\nحالا شرط دسترسی (محصول یا سات) را انتخاب کنید.", [
            'reply_markup' => $this->adminMenuMarkup($actor),
        ]);
        $this->renderDestinationRequirementPicker($client, $chatId, 0, $saved->fresh(['requirements']) ?? $saved);
    }

    private function formatDestinationRequirementLabel(TelegramDestinationRequirement $req): string
    {
        if ($req->requirement_type === 'sat_membership') {
            return 'عضویت فعال سات';
        }

        if (in_array($req->requirement_type, ['product', 'active_course_access'], true)) {
            $productTitle = \App\Models\Product::query()
                ->whereKey((int) $req->requirement_value)
                ->value('title');

            return $productTitle ?: 'محصول #'.$req->requirement_value;
        }

        return $req->requirement_type.'='.$req->requirement_value;
    }

    private function handleDiscountsCallback(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        string $data,
    ): void {
        if (! $account->hasBotAdminPermission(\App\Modules\TelegramBot\Enums\BotAdminPermission::Discount)
            && ! $account->isPermanentBotAdmin()) {
            throw new RuntimeException('دسترسی «کد تخفیف» لازم است.');
        }

        $parts = explode(':', $data);
        $action = $parts[2] ?? 'list';

        if ($action === 'noop') {
            return;
        }

        if ($action === 'list') {
            $this->renderDiscountsList($client, $chatId, $messageId);

            return;
        }

        if ($action === 'add') {
            $this->startDiscountSingleWizard($account, $client, $chatId);

            return;
        }

        if ($action === 'batch') {
            $client->sendMessage(
                $chatId,
                "➕ کد تخفیف دسته‌ای\n\n"
                ."این بخش به‌زودی فعال می‌شود.\n"
                .'فعلاً از «کد تخفیف جدید (تکی)» استفاده کنید.',
            );
            $this->renderDiscountsList($client, $chatId, $messageId);

            return;
        }

        if ($action === 'file') {
            $client->sendMessage(
                $chatId,
                "📁 ساخت با فایل\n\n"
                ."آپلود فایل (CSV/Excel) به‌زودی فعال می‌شود.\n"
                .'فعلاً از «کد تخفیف جدید (تکی)» استفاده کنید.',
            );
            $this->renderDiscountsList($client, $chatId, $messageId);

            return;
        }

        $id = (int) ($parts[3] ?? 0);
        $code = DiscountCode::query()->whereKey($id)->first();
        if ($code === null && in_array($action, ['i', 't', 'del'], true)) {
            throw new RuntimeException('کد تخفیف یافت نشد.');
        }

        if ($action === 't' && $code) {
            $code->update(['is_active' => ! $code->is_active]);
            $this->renderDiscountsList($client, $chatId, $messageId, 'وضعیت کد به‌روز شد.');

            return;
        }

        if ($action === 'del' && $code) {
            if ($code->usages()->exists()) {
                throw new RuntimeException('این کد در سفارش‌ها استفاده شده و قابل حذف نیست.');
            }
            $label = $code->code;
            $code->delete();
            $this->renderDiscountsList($client, $chatId, $messageId, "🗑️ کد «{$label}» حذف شد.");

            return;
        }

        if ($action === 'i' && $code) {
            $this->renderDiscountDetail($client, $chatId, $messageId, $code);

            return;
        }

        $this->renderDiscountsList($client, $chatId, $messageId);
    }

    private function startDiscountSingleWizard(
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
    ): void {
        $conversation = $this->conversations->forAccount($account);
        $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
            'admin' => ['flow' => 'dc_add_code', 'draft' => []],
        ]);
        $client->sendMessage(
            $chatId,
            'کد مورد نظر را با حروف یا اعداد انگلیسی وارد کنید:',
            ['reply_markup' => $this->adminMenuMarkup($account)],
        );
    }

    private function renderDiscountsList(
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        ?string $notice = null,
    ): void {
        $items = DiscountCode::query()
            ->withCount('usages')
            ->where('is_active', true)
            ->latest('id')
            ->limit(30)
            ->get();

        $inactiveCount = DiscountCode::query()->where('is_active', false)->count();

        $text = ($notice ? $notice."\n\n" : '');
        if ($items->isEmpty()) {
            $text .= 'هیچ کد تخفیفی فعال نیست.';
            if ($inactiveCount > 0) {
                $text .= "\n({$inactiveCount} کد غیرفعال در پنل سایت قابل مشاهده است.)";
            }
        } else {
            $text .= "🎟 کدهای تخفیف فعال\n"
                ."یکپارچه با پنل سایت — در وب و ربات یکسان کار می‌کند.\n";
        }

        $keyboard = [
            [
                ['text' => '+ کد تخفیف جدید (تکی)', 'callback_data' => 'admin:dc:add'],
                ['text' => '+ کد تخفیف دسته ای', 'callback_data' => 'admin:dc:batch'],
            ],
            [['text' => '📁 ساخت با فایل', 'callback_data' => 'admin:dc:file']],
        ];

        foreach ($items as $item) {
            $typeLabel = $item->discount_type === DiscountType::Percent
                ? $item->discount_value.'%'
                : number_format((int) $item->discount_value).'ت';
            $name = mb_substr($item->code.' · '.$typeLabel, 0, 28);
            $keyboard[] = [
                ['text' => $name, 'callback_data' => 'admin:dc:i:'.$item->id],
                ['text' => '✅', 'callback_data' => 'admin:dc:t:'.$item->id],
                ['text' => '🗑️', 'callback_data' => 'admin:dc:del:'.$item->id],
            ];
        }

        $keyboard[] = [['text' => 'بازگشت', 'callback_data' => 'admin:h']];

        $this->editOrSend($client, $chatId, $messageId, $text, ['inline_keyboard' => $keyboard]);
    }

    private function renderDiscountDetail(
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        DiscountCode $code,
    ): void {
        $code->loadCount('usages');
        $code->loadMissing(['users', 'products']);
        $typeLabel = $code->discount_type === DiscountType::Percent
            ? $code->discount_value.'٪'
            : number_format((int) $code->discount_value).' تومان';

        $userLabel = $code->users->isEmpty()
            ? 'عمومی'
            : $code->users->map(fn (User $u) => '#'.$u->id)->implode(', ');
        $productLabel = $code->products->isEmpty()
            ? 'همه اشتراک‌ها'
            : $code->products->pluck('title')->implode('، ');

        $text = "🎟 کد: {$code->code}\n"
            ."تخفیف: {$typeLabel}\n"
            ."کاربر: {$userLabel}\n"
            .'انقضا: '.($code->ends_at ? JalaliDate::format($code->ends_at) : 'ندارد')."\n"
            .'سقف کاربران: '.($code->max_uses ?? 'نامحدود')."\n"
            .'سقف هر کاربر: '.($code->max_uses_per_user ?? 'نامحدود')."\n"
            ."اشتراک: {$productLabel}\n"
            ."مصرف‌شده: {$code->usages_count}\n"
            .'فعال: '.($code->is_active ? 'بله' : 'خیر');

        $keyboard = [
            [
                ['text' => $code->is_active ? '⛔ غیرفعال' : '✅ فعال', 'callback_data' => 'admin:dc:t:'.$code->id],
                ['text' => '🗑️ حذف', 'callback_data' => 'admin:dc:del:'.$code->id],
            ],
            [
                ['text' => '◀️ لیست', 'callback_data' => 'admin:dc:list'],
                ['text' => 'بازگشت', 'callback_data' => 'admin:h'],
            ],
        ];

        $this->editOrSend($client, $chatId, $messageId, $text, ['inline_keyboard' => $keyboard]);
    }

    private function onDiscountWizardStep(
        TelegramBot $bot,
        TelegramAccount $actor,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
        string $step,
    ): void {
        $draft = (array) data_get($conversation->context, 'admin.draft', []);
        $input = trim($text);
        $isNull = $this->isDiscountNullCommand($input);

        match ($step) {
            'code' => $this->discountWizardCode($conversation, $client, $chatId, $input, $draft),
            'percent' => $this->discountWizardPercent($conversation, $client, $chatId, $input, $draft),
            'user' => $this->discountWizardUser($bot, $conversation, $client, $chatId, $input, $isNull, $draft),
            'expires' => $this->discountWizardExpires($conversation, $client, $chatId, $input, $isNull, $draft),
            'max_uses' => $this->discountWizardMaxUses($conversation, $client, $chatId, $input, $isNull, $draft),
            'max_per_user' => $this->discountWizardMaxPerUser($conversation, $client, $chatId, $input, $isNull, $draft),
            'product' => $this->discountWizardProduct($actor, $conversation, $client, $chatId, $input, $isNull, $draft),
            default => $client->sendMessage($chatId, 'فرآیند ناقص است. دوباره از افزودن شروع کنید.'),
        };
    }

    /** @param  array<string, mixed>  $draft */
    private function discountWizardCode(
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $input,
        array $draft,
    ): void {
        $code = strtoupper(preg_replace('/\s+/u', '', $input) ?? '');
        if ($code === '' || ! preg_match('/^[A-Z0-9_-]{2,40}$/', $code)) {
            $client->sendMessage($chatId, 'کد مورد نظر را با حروف یا اعداد انگلیسی وارد کنید:');

            return;
        }

        if (DiscountCode::query()->whereRaw('UPPER(code) = ?', [$code])->exists()) {
            $client->sendMessage($chatId, 'این کد از قبل وجود دارد. کد دیگری وارد کنید:');

            return;
        }

        $draft['code'] = $code;
        $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
            'admin' => ['flow' => 'dc_add_percent', 'draft' => $draft],
        ]);
        $client->sendMessage($chatId, 'درصد تخفیف را بین 1 و 100 با اعداد انگلیسی وارد کنید:');
    }

    /** @param  array<string, mixed>  $draft */
    private function discountWizardPercent(
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $input,
        array $draft,
    ): void {
        if (! preg_match('/^\d{1,3}$/', $input)) {
            $client->sendMessage($chatId, 'درصد تخفیف را بین 1 و 100 با اعداد انگلیسی وارد کنید:');

            return;
        }

        $value = (int) $input;
        if ($value < 1 || $value > 100) {
            $client->sendMessage($chatId, 'درصد تخفیف را بین 1 و 100 با اعداد انگلیسی وارد کنید:');

            return;
        }

        $draft['discount_type'] = DiscountType::Percent->value;
        $draft['discount_value'] = $value;
        $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
            'admin' => ['flow' => 'dc_add_user', 'draft' => $draft],
        ]);
        $client->sendMessage(
            $chatId,
            'اگر کد متعلق به کاربر خاصی میباشد شناسه عدد او را ارسال کرده و اگر کد عمومی است دستور /null را ارسال کنید:',
        );
    }

    /** @param  array<string, mixed>  $draft */
    private function discountWizardUser(
        TelegramBot $bot,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $input,
        bool $isNull,
        array $draft,
    ): void {
        if ($isNull) {
            $draft['user_id'] = null;
        } else {
            if (! preg_match('/^\d+$/', $input)) {
                $client->sendMessage(
                    $chatId,
                    'شناسه عدد معتبر بفرستید یا برای کد عمومی دستور /null را ارسال کنید:',
                );

                return;
            }

            $numericId = (int) $input;
            $userId = $this->resolveDiscountUserId($bot, $numericId);
            if ($userId === null) {
                $client->sendMessage(
                    $chatId,
                    'کاربری با این شناسه پیدا نشد. شناسه سایت یا ایدی تلگرام کاربر ثبت‌نام‌شده را بفرستید، یا /null:',
                );

                return;
            }

            $draft['user_id'] = $userId;
        }

        $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
            'admin' => ['flow' => 'dc_add_expires', 'draft' => $draft],
        ]);
        $client->sendMessage(
            $chatId,
            "زمان انقضا کد را مانند مثال زیر ارسال کنید و یا اگر انقضا ندارد دستور /null را ارسال کنید.\n\n"
            ."مثال:\n1403-05-15 12:30:00",
        );
    }

    /** @param  array<string, mixed>  $draft */
    private function discountWizardExpires(
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $input,
        bool $isNull,
        array $draft,
    ): void {
        if ($isNull) {
            $draft['ends_at'] = null;
        } else {
            $parsed = JalaliDate::parseDateTime($input);
            if ($parsed === null) {
                $client->sendMessage(
                    $chatId,
                    "فرمت تاریخ نامعتبر است. مانند مثال بفرستید یا /null:\n1403-05-15 12:30:00",
                );

                return;
            }
            $draft['ends_at'] = $parsed->toIso8601String();
        }

        $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
            'admin' => ['flow' => 'dc_add_max_uses', 'draft' => $draft],
        ]);
        $client->sendMessage(
            $chatId,
            'حداکثر تعداد کاربری که میتوانند از این کد استفاده کنند را با اعداد انگلیسی وارد کرده و یا اگر محدودیت ندارد دستور /null را ارسال کنید:',
        );
    }

    /** @param  array<string, mixed>  $draft */
    private function discountWizardMaxUses(
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $input,
        bool $isNull,
        array $draft,
    ): void {
        if ($isNull) {
            $draft['max_uses'] = null;
        } else {
            if (! preg_match('/^\d+$/', $input) || (int) $input < 1) {
                $client->sendMessage(
                    $chatId,
                    'عدد انگلیسی معتبر بفرستید یا اگر محدودیت ندارد /null را ارسال کنید:',
                );

                return;
            }
            $draft['max_uses'] = (int) $input;
        }

        $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
            'admin' => ['flow' => 'dc_add_max_per_user', 'draft' => $draft],
        ]);
        $client->sendMessage(
            $chatId,
            'حداکثر تعداد دفعاتی که یک کاربر می تواند از این کد استفاده کند را با اعداد انگلیسی وارد کنید. اگر محدودیتی ندارد دستور /null را ارسال کنید:',
        );
    }

    /** @param  array<string, mixed>  $draft */
    private function discountWizardMaxPerUser(
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $input,
        bool $isNull,
        array $draft,
    ): void {
        if ($isNull) {
            $draft['max_uses_per_user'] = null;
        } else {
            if (! preg_match('/^\d+$/', $input) || (int) $input < 1) {
                $client->sendMessage(
                    $chatId,
                    'عدد انگلیسی معتبر بفرستید یا اگر محدودیت ندارد /null را ارسال کنید:',
                );

                return;
            }
            $draft['max_uses_per_user'] = (int) $input;
        }

        $products = Product::query()
            ->where('is_active', true)
            ->orderBy('id')
            ->limit(30)
            ->get(['id', 'title']);

        $map = [];
        $lines = [];
        foreach ($products->values() as $index => $product) {
            $cmd = '/chat'.($index + 1);
            $map[$cmd] = (int) $product->id;
            $lines[] = $product->title.': '.$cmd;
        }
        $draft['product_commands'] = $map;

        $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
            'admin' => ['flow' => 'dc_add_product', 'draft' => $draft],
        ]);

        $list = $lines === []
            ? "(محصول فعالی ثبت نشده — /null بفرستید)\n"
            : implode("\n", $lines);

        $client->sendMessage(
            $chatId,
            "اگر کد مخصوص اشتراک خاصی میباشد دستور آن را انتخاب کرده و در غیر این صورت دستور /null را ارسال کنید.\n\n"
            ."لیست اشتراک ها:\n\n{$list}",
        );
    }

    /** @param  array<string, mixed>  $draft */
    private function discountWizardProduct(
        TelegramAccount $actor,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $input,
        bool $isNull,
        array $draft,
    ): void {
        $productId = null;
        if (! $isNull) {
            $cmd = strtolower(trim($input));
            if (! str_starts_with($cmd, '/')) {
                $cmd = '/'.$cmd;
            }
            $map = (array) ($draft['product_commands'] ?? []);
            if (! isset($map[$cmd])) {
                $client->sendMessage(
                    $chatId,
                    'دستور اشتراک معتبر نیست. یکی از دستورهای لیست را بفرستید یا /null:',
                );

                return;
            }
            $productId = (int) $map[$cmd];
        }

        $code = strtoupper((string) ($draft['code'] ?? ''));
        $value = (int) ($draft['discount_value'] ?? 0);
        if ($code === '' || $value < 1) {
            $client->sendMessage($chatId, 'فرآیند ناقص است. دوباره از افزودن شروع کنید.', [
                'reply_markup' => $this->adminMenuMarkup($actor),
            ]);

            return;
        }

        $userId = isset($draft['user_id']) ? (int) $draft['user_id'] : null;
        if ($userId !== null && $userId <= 0) {
            $userId = null;
        }

        $restriction = match (true) {
            $userId !== null && $productId !== null => DiscountRestriction::All,
            $userId !== null => DiscountRestriction::SpecificUsers,
            $productId !== null => DiscountRestriction::SpecificProducts,
            default => DiscountRestriction::All,
        };

        $created = DiscountCode::query()->create([
            'code' => $code,
            'title' => $code,
            'discount_type' => DiscountType::Percent,
            'discount_value' => $value,
            'is_active' => true,
            'ends_at' => filled($draft['ends_at'] ?? null) ? $draft['ends_at'] : null,
            'max_uses' => $draft['max_uses'] ?? null,
            'max_uses_per_user' => $draft['max_uses_per_user'] ?? null,
            'restriction' => $restriction,
            'requires_link' => false,
            'uses_count' => 0,
        ]);

        if ($userId !== null) {
            $created->users()->sync([$userId]);
        }
        if ($productId !== null) {
            $created->products()->sync([$productId]);
        }

        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);

        $client->sendMessage(
            $chatId,
            "✅ کد تخفیف «{$created->code}» با موفقیت ساخته شد و در سایت و ربات فعال است.",
            ['reply_markup' => $this->adminMenuMarkup($actor)],
        );
        $this->renderDiscountsList($client, $chatId, 0);
    }

    private function isDiscountNullCommand(string $input): bool
    {
        $normalized = strtolower(trim($input));

        return in_array($normalized, ['/null', 'null', 'nul'], true);
    }

    private function resolveDiscountUserId(TelegramBot $bot, int $numericId): ?int
    {
        if (User::query()->whereKey($numericId)->exists()) {
            return $numericId;
        }

        $account = TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('telegram_user_id', $numericId)
            ->whereNotNull('user_id')
            ->first();

        return $account?->user_id ? (int) $account->user_id : null;
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
        if ($data === 'admin:s:rs') {
            $result = app(TelegramBotResetService::class)->reset($bot);
            $lines = [
                '✅ ریست صف و وب‌هوک انجام شد.',
                '',
                'تلگرام (remote): '.($result['pending_remote'] ?? '?'),
                'معلق محلی: '.($result['pending_local'] ?? 0),
                'ناموفق محلی: '.($result['failed_local'] ?? 0),
            ];
            if (filled($result['last_error'] ?? null)) {
                $lines[] = 'آخرین خطای تلگرام: '.mb_substr((string) $result['last_error'], 0, 120);
            }
            if (($result['actions'] ?? []) !== []) {
                $lines[] = '';
                $lines[] = implode(' · ', $result['actions']);
            }
            $this->renderSettings($bot, $client, $chatId, $messageId, implode("\n", $lines));

            return;
        }

        if ($data === 'admin:s:wh') {
            $infrastructure = app(\App\Services\TelegramInfrastructureService::class);
            $url = $infrastructure->buildWebhookUrl($bot->key);
            try {
                $client->setWebhook($url, $bot->resolveWebhookSecret());
                $mode = $infrastructure->usesWorkerBridge() ? 'Cloudflare Worker' : 'مستقیم';
                app(TelegramWebhookRegisteredNotifier::class)->notify($bot, $url, $mode);
                $this->renderSettings($bot, $client, $chatId, $messageId, "✅ وب‌هوک ثبت شد:\n{$url}");
            } catch (Throwable $e) {
                $this->renderSettings(
                    $bot,
                    $client,
                    $chatId,
                    $messageId,
                    '❌ ثبت وب‌هوک ناموفق: '.$e->getMessage(),
                );
            }

            return;
        }

        if ($data === 'admin:s:ac') {
            $bot->update(['is_active' => ! $bot->is_active]);
            $this->renderSettings($bot, $client, $chatId, $messageId, 'وضعیت ربات به‌روز شد.');

            return;
        }

        if ($data === 'admin:s:zp') {
            $this->beginZarinpalMerchantFlow($bot, $account, $client, $chatId);

            return;
        }

        if ($data === 'admin:s:c2c') {
            $conversation = $this->conversations->forAccount($account);
            $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
                'admin' => ['flow' => 'card_to_card_text', 'draft' => []],
            ]);
            $client->sendMessage(
                $chatId,
                "📝 متن راهنمای کارت‌به‌کارت را بفرستید (شماره کارت، نام صاحب حساب، …).\n\nالان:\n".$bot->cardToCardInstructions(),
                ['reply_markup' => $this->adminMenuMarkup($account)],
            );

            return;
        }

        if ($data === 'admin:s:rg') {
            $conversation = $this->conversations->forAccount($account);
            $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
                'admin' => ['flow' => 'reports_group', 'draft' => []],
            ]);
            $current = filled($bot->reportsGroupChatId())
                ? (string) $bot->reportsGroupChatId()
                : 'تنظیم نشده';
            $client->sendMessage(
                $chatId,
                "🎫 گروه گزارشات (پشتیبانی)\n\n"
                ."پیام‌های پشتیبانی کاربران فقط در این گروه فوروارد می‌شود.\n"
                ."ادمین‌ها روی پیام آیدی عددی کاربر ریپلای می‌کنند تا جواب برسد.\n\n"
                ."وضعیت فعلی: `{$current}`\n\n"
                ."۱) ربات را داخل گروه گزارشات ادمین کنید\n"
                ."۲) آیدی عددی گروه را با اعداد لاتین بفرستید\n"
                ."مثال:\n"
                ."`-1003623149563`\n\n"
                ."برای پاک کردن `/null` بفرستید.\n"
                .'برای انصراف «لغو» بفرستید.',
                [
                    'parse_mode' => 'Markdown',
                    'reply_markup' => [
                        'keyboard' => [[['text' => 'لغو']]],
                        'resize_keyboard' => true,
                    ],
                ],
            );

            return;
        }

        if ($data === 'admin:s:pr') {
            $conversation = $this->conversations->forAccount($account);
            $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
                'admin' => ['flow' => 'payment_reports', 'draft' => []],
            ]);
            $current = filled($bot->paymentReportsChatId())
                ? (string) $bot->paymentReportsChatId()
                : 'تنظیم نشده';
            $client->sendMessage(
                $chatId,
                "🏦 گروه/کانال گزارشات پرداخت\n\n"
                ."رسیدهای کارت‌به‌کارت، خریدهای موفق زرین‌پال و پرداخت‌های سایت فقط اینجا می‌آید.\n"
                ."تأیید/رد کارت‌به‌کارت هم از همین‌جا انجام می‌شود — نه در چت خصوصی ادمین.\n\n"
                ."وضعیت فعلی: `{$current}`\n\n"
                ."۱) ربات را داخل گروه/کانال ادمین کنید\n"
                ."۲) آیدی عددی را با اعداد لاتین بفرستید\n"
                ."مثال:\n"
                ."`-1003623149563`\n\n"
                ."برای پاک کردن `/null` بفرستید.\n"
                .'برای انصراف «لغو» بفرستید.',
                [
                    'parse_mode' => 'Markdown',
                    'reply_markup' => [
                        'keyboard' => [[['text' => 'لغو']]],
                        'resize_keyboard' => true,
                    ],
                ],
            );

            return;
        }

        if (str_starts_with($data, 'admin:s:t:')) {
            $key = substr($data, strlen('admin:s:t:'));
            $flag = \App\Modules\TelegramBot\Enums\BotFeatureFlag::tryFrom($key);
            if ($flag === null) {
                throw new RuntimeException('تنظیم نامعتبر است.');
            }
            $bot->refresh();
            $on = $bot->toggleFeature($flag);
            $this->renderSettings(
                $bot->fresh() ?? $bot,
                $client,
                $chatId,
                $messageId,
                ($on ? '✅ فعال شد: ' : '❌ غیرفعال شد: ').$flag->labelFa(),
            );

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
        $bot->refresh();
        $health = $this->health->run();
        $botHealth = $health['bots'][$bot->key] ?? [];
        $updates = $health['updates'] ?? [];
        $queueStats = app(TelegramBotResetService::class)->queueStats($bot);

        $text = ($notice ? $notice."\n\n" : '')
            ."⚙️ تنظیمات ربات\n\n"
            .'وضعیت ربات: '.($bot->is_active ? 'فعال ✅' : 'غیرفعال ⛔')."\n"
            .'توکن: '.(($botHealth['token_present'] ?? false) ? '✅' : '❌')."\n"
            .'API: '.(($botHealth['api_reachable'] ?? false) ? '✅' : '❌')."\n"
            .'وب‌هوک: '.($botHealth['webhook_url'] ?? '—')."\n"
            .'گروه گزارشات: '.(filled($bot->reportsGroupChatId()) ? (string) $bot->reportsGroupChatId() : 'تنظیم نشده')."\n"
            .'گزارشات پرداخت: '.(filled($bot->paymentReportsChatId()) ? (string) $bot->paymentReportsChatId() : 'تنظیم نشده')."\n"
            ."آپدیت معلق (محلی): ".($queueStats['pending_local'] ?? 0)."\n"
            .'در حال پردازش: '.($queueStats['processing_local'] ?? 0)."\n"
            .'آپدیت ناموفق: '.($queueStats['failed_local'] ?? 0)."\n"
            .'صف تلگرام (remote): '.($queueStats['pending_remote'] ?? '—')."\n\n"
            .'برای تغییر هر گزینه روی آن بزنید:';

        $keyboard = [];
        $keyboard[] = [[
            'text' => ($bot->is_active ? '✅' : '❌').' وضعیت ربات',
            'callback_data' => 'admin:s:ac',
        ]];

        foreach (\App\Modules\TelegramBot\Enums\BotFeatureFlag::ordered() as $flag) {
            $on = $bot->featureEnabled($flag);
            $keyboard[] = [[
                'text' => ($on ? '✅' : '❌').' '.$flag->labelFa(),
                'callback_data' => 'admin:s:t:'.$flag->value,
            ]];
        }

        $keyboard[] = [
            ['text' => '🎫 گروه گزارشات', 'callback_data' => 'admin:s:rg'],
            ['text' => '🏦 گزارشات پرداخت', 'callback_data' => 'admin:s:pr'],
        ];
        $keyboard[] = [
            ['text' => '💳 مرچنت زرین‌پال', 'callback_data' => 'admin:s:zp'],
            ['text' => '📝 متن کارت به کارت', 'callback_data' => 'admin:s:c2c'],
        ];
        $keyboard[] = [
            ['text' => '🔗 ثبت وب‌هوک', 'callback_data' => 'admin:s:wh'],
            ['text' => '🔄 ریست صف', 'callback_data' => 'admin:s:rs'],
        ];
        $keyboard[] = [
            ['text' => '🏠 داشبورد', 'callback_data' => 'admin:h'],
        ];

        $siteButton = TelegramSiteUrl::inlineButton('پنل وب', TelegramSiteUrl::adminTelegram());
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
            ->get(['id', 'update_type', 'error_message']);

        $lines = [($notice ? $notice."\n\n" : '').'📋 لاگ‌ها', '', "معلق: {$pending}", "ناموفق: {$failed}", ''];

        foreach ($recentFailed as $item) {
            $lines[] = "#{$item->id} · {$item->update_type}";
            if ($item->error_message) {
                $lines[] = mb_substr((string) $item->error_message, 0, 80);
            }
        }

        $keyboard = [
            [['text' => '🔁 تلاش مجدد (۵۰)', 'callback_data' => 'admin:l:rt']],
            [['text' => '🏠 داشبورد', 'callback_data' => 'admin:h']],
        ];

        $this->editOrSend($client, $chatId, $messageId, implode("\n", $lines), ['inline_keyboard' => $keyboard]);
    }

    /** @param  array<string, mixed>  $replyMarkup
     * @param  array<string, mixed>  $options */
    private function editOrSend(
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        string $text,
        array $replyMarkup,
        array $options = [],
    ): void {
        if ($messageId > 0) {
            try {
                $client->editMessageText($text, [
                    'chat_id' => $chatId,
                    'message_id' => $messageId,
                    'reply_markup' => $replyMarkup,
                    ...$options,
                ]);

                return;
            } catch (Throwable) {
                // Fall back to a fresh message when the old inline message cannot be edited.
            }
        }

        $client->sendMessage($chatId, $text, ['reply_markup' => $replyMarkup, ...$options]);
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
