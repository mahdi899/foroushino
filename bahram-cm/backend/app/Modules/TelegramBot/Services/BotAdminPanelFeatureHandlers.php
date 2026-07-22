<?php

namespace App\Modules\TelegramBot\Services;

use App\Enums\AdminTelegramEventKey;
use App\Models\AdminTelegramEventConfig;
use App\Models\PaymentSetting;
use App\Models\SmsSetting;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Modules\TelegramBot\Contracts\TelegramBotClientInterface;
use App\Modules\TelegramBot\Enums\BotAdminPermission;
use App\Services\AdminTelegramLogService;
use App\Modules\TelegramBot\Enums\BotAdminRank;
use App\Modules\TelegramBot\Enums\ConversationState;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramBroadcast;
use App\Modules\TelegramBot\Models\TelegramConversation;
use RuntimeException;

/**
 * Extra admin-panel flows: stats, export, tickets, messages, zarinpal, segments.
 *
 * @property TelegramBotClientFactory $clients
 * @property ConversationService $conversations
 * @property BotUsageStatsService $usageStats
 * @property TelegramUserExportService $userExport
 * @property BotTicketDeliveryService $ticketDelivery
 * @property BotMessageCatalog $messageCatalog
 * @property TelegramAudienceSegmentResolver $audienceSegments
 */
trait BotAdminPanelFeatureHandlers
{
    private function assertSuperAdmin(TelegramAccount $actor): void
    {
        if (! $actor->canManageBotAdmins()) {
            throw new RuntimeException('فقط ادمین برتر می‌تواند ادمین‌ها را مدیریت کند.');
        }
    }

    private function openStatsSection(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
    ): void {
        $client->sendMessage($chatId, $this->usageStats->formatSummaryText($bot), [
            'reply_markup' => $this->adminMenuMarkup($account),
        ]);
    }

    private function openExportSection(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId = 0,
    ): void {
        $text = "📤 خروجی کاربران\n\n"
            ."فایل TXT از کاربرانی که در بازهٔ انتخابی عضو بات شده‌اند.\n"
            .'حداکثر بازه: ۳۰ روز.';

        $keyboard = [
            [
                ['text' => '۷ روز', 'callback_data' => 'admin:ex:7'],
                ['text' => '۱۴ روز', 'callback_data' => 'admin:ex:14'],
                ['text' => '۳۰ روز', 'callback_data' => 'admin:ex:30'],
            ],
            [['text' => '🏠 داشبورد', 'callback_data' => 'admin:h']],
        ];

        $this->editOrSend($client, $chatId, $messageId, $text, ['inline_keyboard' => $keyboard]);
    }

    private function handleExportCallback(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        string $data,
    ): void {
        if (! $account->hasBotAdminPermission(BotAdminPermission::DataExport)) {
            throw new RuntimeException('دسترسی خروجی دیتا ندارید.');
        }

        $days = (int) (explode(':', $data)[2] ?? 0);
        if (! in_array($days, [7, 14, 30], true)) {
            $this->openExportSection($bot, $account, $client, $chatId, $messageId);

            return;
        }

        $client->sendMessage($chatId, "⏳ در حال آماده‌سازی خروجی {$days} روز…");

        try {
            $export = $this->userExport->exportTxt($bot, $days);

            $client->sendDocument($chatId, [
                'content' => $export['content'],
                'filename' => $export['filename'],
            ], [
                'caption' => "✅ خروجی {$days} روز — {$export['count']} کاربر",
            ]);

            $client->sendMessage($chatId, 'فایل ارسال شد.', [
                'reply_markup' => $this->adminMenuMarkup($account),
            ]);
        } catch (\Throwable $e) {
            $client->sendMessage(
                $chatId,
                '⚠️ ارسال فایل خروجی ناموفق بود. دوباره تلاش کنید یا از پنل وب خروجی بگیرید.',
                ['reply_markup' => $this->adminMenuMarkup($account)],
            );
            throw $e;
        }
    }

    private function openTicketsSection(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId = 0,
        int $page = 0,
    ): void {
        $perPage = 8;
        $total = $this->ticketDelivery->countOpenTicketsForBot($bot);
        $tickets = $this->ticketDelivery->openTicketsForBot($bot, $perPage, $page * $perPage);

        $text = "🎫 تیکت‌های باز بات\nتعداد: {$total}\n\nیکی را برای مشاهده/پاسخ انتخاب کنید.";
        $keyboard = [];

        foreach ($tickets as $ticket) {
            $label = '#'.$ticket->id.' · '.mb_substr((string) $ticket->subject, 0, 28);
            $keyboard[] = [['text' => $label, 'callback_data' => 'admin:tk:i:'.$ticket->id]];
        }

        if ($tickets->isEmpty()) {
            $keyboard[] = [['text' => 'تیکت بازی نیست', 'callback_data' => 'admin:h']];
        }

        $nav = [];
        if ($page > 0) {
            $nav[] = ['text' => '◀️', 'callback_data' => 'admin:tk:p:'.($page - 1)];
        }
        if (($page + 1) * $perPage < $total) {
            $nav[] = ['text' => '▶️', 'callback_data' => 'admin:tk:p:'.($page + 1)];
        }
        if ($nav !== []) {
            $keyboard[] = $nav;
        }
        $keyboard[] = [['text' => '🏠 داشبورد', 'callback_data' => 'admin:h']];

        $this->editOrSend($client, $chatId, $messageId, $text, ['inline_keyboard' => $keyboard]);
    }

    private function handleTicketsCallback(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        string $data,
    ): void {
        if (! $account->hasBotAdminPermission(BotAdminPermission::Tickets)) {
            throw new RuntimeException('دسترسی تیکت ندارید.');
        }

        $parts = explode(':', $data);
        $action = $parts[2] ?? 'p';

        if ($action === 'p') {
            $this->openTicketsSection($bot, $account, $client, $chatId, $messageId, (int) ($parts[3] ?? 0));

            return;
        }

        $ticketId = (int) ($parts[3] ?? 0);
        $ticket = Ticket::query()->with('user')->find($ticketId);
        if ($ticket === null) {
            throw new RuntimeException('تیکت یافت نشد.');
        }

        if ($action === 'i') {
            $this->renderTicketDetail($bot, $account, $client, $chatId, $messageId, $ticket);

            return;
        }

        if ($action === 'r') {
            $conversation = $this->conversations->forAccount($account);
            $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
                'admin' => ['flow' => 'ticket_reply', 'draft' => ['ticket_id' => $ticket->id]],
            ]);
            $client->sendMessage($chatId, "✏️ پاسخ تیکت #{$ticket->id} را بنویسید (یا «لغو»):", [
                'reply_markup' => [
                    'keyboard' => [[['text' => 'لغو']]],
                    'resize_keyboard' => true,
                ],
            ]);

            return;
        }

        if ($action === 'c') {
            $ticket->update(['status' => 'closed']);
            $client->sendMessage($chatId, "✅ تیکت #{$ticket->id} بسته شد.", [
                'reply_markup' => $this->adminMenuMarkup($account),
            ]);
            $this->openTicketsSection($bot, $account, $client, $chatId, 0);

            return;
        }
    }

    private function renderTicketDetail(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        Ticket $ticket,
    ): void {
        $messages = TicketMessage::query()
            ->where('ticket_id', $ticket->id)
            ->orderByDesc('id')
            ->limit(5)
            ->get()
            ->reverse();

        $thread = '';
        foreach ($messages as $msg) {
            $who = $msg->is_admin_reply ? 'ادمین' : 'کاربر';
            $thread .= "• [{$who}] ".mb_substr((string) $msg->message, 0, 200)."\n";
        }

        $text = $this->ticketDelivery->formatTicketPreview($ticket)."\n\nآخرین پیام‌ها:\n".($thread !== '' ? $thread : '—');

        $this->editOrSend($client, $chatId, $messageId, $text, [
            'inline_keyboard' => [
                [
                    ['text' => '✏️ پاسخ', 'callback_data' => 'admin:tk:r:'.$ticket->id],
                    ['text' => '🔒 بستن', 'callback_data' => 'admin:tk:c:'.$ticket->id],
                ],
                [['text' => '◀️ لیست', 'callback_data' => 'admin:tk:p:0']],
            ],
        ]);
    }

    private function onTicketReply(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
    ): void {
        $ticketId = (int) data_get($conversation->context, 'admin.draft.ticket_id');
        $ticket = Ticket::query()->find($ticketId);
        if ($ticket === null) {
            throw new RuntimeException('تیکت یافت نشد.');
        }

        $body = trim($text);
        if ($body === '') {
            throw new RuntimeException('متن پاسخ خالی است.');
        }

        $result = $this->ticketDelivery->deliverAdminReply($ticket, $body, $bot);

        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);

        $status = $result['delivered']
            ? '✅ پاسخ ذخیره و به کاربر در تلگرام ارسال شد.'
            : '✅ پاسخ ذخیره شد، اما ارسال به تلگرام کاربر ممکن نشد (حساب لینک‌شده؟).';

        $client->sendMessage($chatId, $status, [
            'reply_markup' => $this->adminMenuMarkup($account),
        ]);
    }

    private function openMessagesSection(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId = 0,
        int $page = 0,
    ): void {
        $rows = $this->messageCatalog->listForBot($bot);
        $perPage = 8;
        $slice = array_slice($rows, $page * $perPage, $perPage);
        $total = count($rows);

        $text = "💬 پیام‌های قابل ویرایش بات\n"
            ."صفحه ".($page + 1)." — یکی را برای ویرایش انتخاب کنید.";

        $keyboard = [];
        foreach ($slice as $row) {
            $mark = $row['is_custom'] ? '✏️' : '📄';
            $keyboard[] = [[
                'text' => $mark.' '.mb_substr($row['label'], 0, 32),
                'callback_data' => 'admin:msg:i:'.$row['key'],
            ]];
        }

        $nav = [];
        if ($page > 0) {
            $nav[] = ['text' => '◀️', 'callback_data' => 'admin:msg:p:'.($page - 1)];
        }
        if (($page + 1) * $perPage < $total) {
            $nav[] = ['text' => '▶️', 'callback_data' => 'admin:msg:p:'.($page + 1)];
        }
        if ($nav !== []) {
            $keyboard[] = $nav;
        }
        $keyboard[] = [['text' => '🏠 داشبورد', 'callback_data' => 'admin:h']];

        $this->editOrSend($client, $chatId, $messageId, $text, ['inline_keyboard' => $keyboard]);
    }

    private function handleMessagesCallback(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        string $data,
    ): void {
        if (! $account->hasBotAdminPermission(BotAdminPermission::Messages)) {
            throw new RuntimeException('دسترسی پیام‌ها ندارید.');
        }

        $parts = explode(':', $data);
        $action = $parts[2] ?? 'p';

        if ($action === 'p') {
            $this->openMessagesSection($bot, $account, $client, $chatId, $messageId, (int) ($parts[3] ?? 0));

            return;
        }

        $key = (string) ($parts[3] ?? '');
        if ($key === '' || ! isset(BotMessageCatalog::defaults()[$key])) {
            throw new RuntimeException('کلید پیام نامعتبر است.');
        }

        if ($action === 'rst') {
            $this->messageCatalog->reset($bot, $key);
            $client->sendMessage($chatId, '✅ به متن پیش‌فرض برگشت.', [
                'reply_markup' => $this->adminMenuMarkup($account),
            ]);
            $this->renderMessageDetail($bot, $client, $chatId, $messageId, $key);

            return;
        }

        if ($action === 'i' || $action === 'e') {
            if ($action === 'e') {
                $conversation = $this->conversations->forAccount($account);
                $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
                    'admin' => ['flow' => 'message_edit', 'draft' => ['message_key' => $key]],
                ]);
                $client->sendMessage(
                    $chatId,
                    "✏️ متن جدید برای «".BotMessageCatalog::defaults()[$key]['label']."» را بفرستید:\n\n"
                    ."الان:\n".$this->messageCatalog->get($bot, $key),
                    [
                        'reply_markup' => [
                            'keyboard' => [[['text' => 'لغو']]],
                            'resize_keyboard' => true,
                        ],
                    ],
                );

                return;
            }

            $this->renderMessageDetail($bot, $client, $chatId, $messageId, $key);
        }
    }

    private function renderMessageDetail(
        TelegramBot $bot,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        string $key,
    ): void {
        $meta = BotMessageCatalog::defaults()[$key];
        $body = $this->messageCatalog->get($bot, $key);

        $this->editOrSend(
            $client,
            $chatId,
            $messageId,
            "💬 {$meta['label']}\nدسته: {$meta['category']}\nکلید: `{$key}`\n\n{$body}",
            [
                'inline_keyboard' => [
                    [
                        ['text' => '✏️ ویرایش', 'callback_data' => 'admin:msg:e:'.$key],
                        ['text' => '↩️ پیش‌فرض', 'callback_data' => 'admin:msg:rst:'.$key],
                    ],
                    [['text' => '◀️ لیست', 'callback_data' => 'admin:msg:p:0']],
                ],
            ],
        );
    }

    private function onMessageEdit(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
    ): void {
        $key = (string) data_get($conversation->context, 'admin.draft.message_key');
        if ($key === '' || ! isset(BotMessageCatalog::defaults()[$key])) {
            throw new RuntimeException('کلید پیام نامعتبر است.');
        }

        $body = trim($text);
        if ($body === '') {
            throw new RuntimeException('متن خالی است.');
        }

        if (str_starts_with($key, 'menu_btn_')) {
            $body = trim(preg_split("/\r\n|\n|\r/", $body)[0] ?? '');
            if ($body === '') {
                throw new RuntimeException('متن دکمه خالی است.');
            }
            $body = mb_substr($body, 0, 64);
        } else {
            $body = mb_substr($body, 0, 4000);
        }

        $this->messageCatalog->set($bot, $key, $body);
        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);
        $client->sendMessage($chatId, '✅ پیام ذخیره شد.', [
            'reply_markup' => $this->adminMenuMarkup($account),
        ]);
    }

    private function beginZarinpalMerchantFlow(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
    ): void {
        if (! $account->canManageBotAdmins() && ! $account->hasBotAdminPermission(BotAdminPermission::Settings)) {
            throw new RuntimeException('دسترسی تنظیمات ندارید.');
        }

        $settings = PaymentSetting::query()->first();
        $has = filled($settings?->zarinpal_merchant_id);
        $masked = $has ? $this->maskMerchantId((string) $settings->zarinpal_merchant_id) : 'تنظیم نشده';

        $conversation = $this->conversations->forAccount($account);
        $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
            'admin' => ['flow' => 'zarinpal_merchant', 'draft' => []],
        ]);

        $client->sendMessage(
            $chatId,
            "💳 مرچنت کد زرین‌پال\n\nوضعیت فعلی: `{$masked}`\n\n"
            ."مرچنت کد جدید را بفرستید (یا «لغو»).\n"
            .'پس از ارسال، یک تأیید نهایی از شما خواسته می‌شود.',
            [
                'parse_mode' => 'Markdown',
                'reply_markup' => [
                    'keyboard' => [[['text' => 'لغو']]],
                    'resize_keyboard' => true,
                ],
            ],
        );
    }

    private function onZarinpalMerchantInput(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
    ): void {
        $code = trim($text);
        if (mb_strlen($code) < 8) {
            $client->sendMessage($chatId, 'مرچنت کد خیلی کوتاه است. دوباره بفرستید یا «لغو».');

            return;
        }

        $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
            'admin' => [
                'flow' => 'zarinpal_merchant_confirm',
                'draft' => ['merchant_id' => $code],
            ],
        ]);

        $client->sendMessage(
            $chatId,
            "⚠️ تأیید تغییر مرچنت\n\nکد جدید (ماسک): `".$this->maskMerchantId($code)."`\n\n"
            ."برای تأیید کلمه `تایید` را بفرستید.\nبرای انصراف «لغو».",
            ['parse_mode' => 'Markdown'],
        );
    }

    private function onZarinpalMerchantConfirm(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
    ): void {
        if (! in_array(trim($text), ['تایید', 'تأیید', 'confirm', 'yes'], true)) {
            $client->sendMessage($chatId, 'برای تأیید دقیقاً «تایید» بفرستید یا «لغو».');

            return;
        }

        $code = (string) data_get($conversation->context, 'admin.draft.merchant_id');
        if ($code === '') {
            throw new RuntimeException('مرچنت یافت نشد. دوباره شروع کنید.');
        }

        $settings = PaymentSetting::current();
        $settings->update(['zarinpal_merchant_id' => $code]);

        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);

        $client->sendMessage($chatId, '✅ مرچنت کد زرین‌پال ذخیره شد.', [
            'reply_markup' => $this->adminMenuMarkup($account),
        ]);
    }

    private function maskMerchantId(string $id): string
    {
        $len = mb_strlen($id);
        if ($len <= 8) {
            return str_repeat('*', max(0, $len - 2)).mb_substr($id, -2);
        }

        return mb_substr($id, 0, 4).str_repeat('*', $len - 8).mb_substr($id, -4);
    }

    private function promptBroadcastSegment(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        array $draft,
    ): void {
        $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
            'admin' => [
                'flow' => 'broadcast_segment',
                'draft' => $draft,
            ],
        ]);

        $keyboard = [];
        foreach ($this->audienceSegments->labels() as $key => $label) {
            $count = $this->audienceSegments->count((int) $bot->id, $key);
            $keyboard[] = [[
                'text' => "{$label} ({$count})",
                'callback_data' => 'admin:b:sg:'.$key,
            ]];
        }
        $keyboard[] = [['text' => 'لغو', 'callback_data' => 'admin:h']];

        $client->sendMessage($chatId, '🎯 برای کدام گروه ارسال شود؟', [
            'reply_markup' => ['inline_keyboard' => $keyboard],
        ]);
    }

    private function finalizeBroadcastWithSegment(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        string $segmentKey,
        array $draft,
    ): void {
        $title = (string) ($draft['title'] ?? ('پیام '.now()->format('Y-m-d H:i')));
        $body = (string) ($draft['text'] ?? '');
        if ($body === '') {
            throw new RuntimeException('متن پیام خالی است.');
        }

        if (! array_key_exists($segmentKey, TelegramAudienceSegmentResolver::SEGMENTS)) {
            $segmentKey = 'all_bot_users';
        }

        $count = $this->audienceSegments->count((int) $bot->id, $segmentKey);

        $broadcast = TelegramBroadcast::query()->create([
            'telegram_bot_id' => $bot->id,
            'title' => mb_substr($title, 0, 255),
            'status' => 'draft',
            'segment_key' => $segmentKey,
            'audience_count' => $count,
            'content' => ['text' => mb_substr($body, 0, 4000), 'options' => []],
            'created_by' => $account->user_id,
        ]);

        $conversation = $this->conversations->forAccount($account);
        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);

        $this->sendBroadcastPreview($bot, $client, $chatId, $broadcast);
    }

    private function applyAdminRankChoice(
        TelegramBot $bot,
        TelegramAccount $actor,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        string $data,
    ): void {
        $this->assertSuperAdmin($actor);

        // admin:admins:rank:{id}:{simple|super}
        $parts = explode(':', $data);
        $targetId = (int) ($parts[3] ?? 0);
        $rankKey = (string) ($parts[4] ?? 'simple');
        $rank = BotAdminRank::tryFrom($rankKey) ?? BotAdminRank::Simple;

        $target = TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->whereKey($targetId)
            ->first();

        if ($target === null) {
            throw new RuntimeException('ادمین یافت نشد.');
        }
        if ($target->isPermanentBotAdmin()) {
            throw new RuntimeException('رده ادمین دائمی قابل تغییر نیست.');
        }

        $target->setBotAdminRank($rank);
        $this->renderAdminPermissions($client, $chatId, $messageId, $target->fresh() ?? $target);
        $client->sendMessage($chatId, '✅ رده ادمین: '.$rank->labelFa());
    }

    /**
     * «رویدادها»: اطلاع‌رسانی خودکار سفارش/تیکت/ثبت‌نام و... به چت(های) ادمین —
     * از همین بات (بدون توکن جدا) ارسال می‌شود.
     */
    private function openEventsSection(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId = 0,
    ): void {
        $this->renderEvents($client, $chatId, $messageId);
    }

    private function handleEventsCallback(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        string $data,
    ): void {
        if (! $account->hasBotAdminPermission(BotAdminPermission::Events)) {
            throw new RuntimeException('دسترسی رویدادها ندارید.');
        }

        // admin:ev:{action}[:extra]
        $parts = explode(':', $data);
        $action = $parts[2] ?? 'p';

        if ($action === 'g') {
            $settings = SmsSetting::current();
            $settings->update(['admin_telegram_enabled' => ! $settings->admin_telegram_enabled]);
            $this->renderEvents($client, $chatId, $messageId);

            return;
        }

        if ($action === 't') {
            $key = (string) ($parts[3] ?? '');
            $eventKey = AdminTelegramEventKey::tryFrom($key);
            if ($eventKey === null) {
                throw new RuntimeException('رویداد نامعتبر است.');
            }

            $event = AdminTelegramEventConfig::forKey($eventKey);
            if ($event !== null) {
                $event->update(['is_enabled' => ! $event->is_enabled]);
            }

            $this->renderEvents($client, $chatId, $messageId);

            return;
        }

        if ($action === 'cid') {
            $conversation = $this->conversations->forAccount($account);
            $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
                'admin' => ['flow' => 'events_chat_ids', 'draft' => []],
            ]);

            $current = (string) (SmsSetting::current()->admin_telegram_chat_ids ?: 'تنظیم نشده');
            $client->sendMessage(
                $chatId,
                "🆔 چت‌های گیرنده رویدادها\n\n"
                ."شناسه چت(های) تلگرام که پیام رویدادها به آن‌ها ارسال می‌شود. چند چت را با کاما یا فاصله جدا کنید.\n\n"
                ."وضعیت فعلی:\n`{$current}`\n\n"
                .'شناسه(های) جدید را بفرستید یا «لغو».',
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

        if ($action === 'test') {
            $result = app(AdminTelegramLogService::class)->sendTest();
            $client->sendMessage($chatId, $result['success'] ? '✅ '.$result['message'] : '❌ '.$result['message']);
            $this->renderEvents($client, $chatId, $messageId);

            return;
        }

        $this->renderEvents($client, $chatId, $messageId);
    }

    private function onEventsChatIdsInput(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
    ): void {
        if (trim($text) === '/null') {
            SmsSetting::current()->update(['admin_telegram_chat_ids' => null]);
        } else {
            SmsSetting::current()->update(['admin_telegram_chat_ids' => mb_substr(trim($text), 0, 1000)]);
        }

        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);

        $client->sendMessage($chatId, '✅ چت‌های گیرنده رویدادها ذخیره شد.', [
            'reply_markup' => $this->adminMenuMarkup($account),
        ]);
    }

    private function renderEvents(
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId = 0,
    ): void {
        $settings = SmsSetting::current();
        $globalEnabled = (bool) $settings->admin_telegram_enabled;
        $chatIds = (string) ($settings->admin_telegram_chat_ids ?: '—');

        $configs = AdminTelegramEventConfig::query()->pluck('is_enabled', 'event_key');

        $text = "📡 رویدادها\n\n"
            ."اطلاع‌رسانی خودکار سفارش، پرداخت، تیکت، ثبت‌نام و... به چت(های) ادمین — از همین بات.\n\n"
            .'وضعیت کلی: '.($globalEnabled ? '✅ فعال' : '⛔ غیرفعال')."\n"
            ."چت‌های گیرنده: `{$chatIds}`\n\n"
            .'رویداد مورد نظر را برای فعال/غیرفعال‌کردن انتخاب کنید:';

        $keyboard = [
            [['text' => $globalEnabled ? '⛔ غیرفعال‌کردن همه' : '✅ فعال‌کردن همه', 'callback_data' => 'admin:ev:g']],
        ];

        foreach (AdminTelegramEventKey::all() as $eventKey) {
            $enabled = (bool) ($configs[$eventKey->value] ?? $eventKey->defaultEnabled());
            $mark = $enabled ? '✅' : '⛔';
            $keyboard[] = [[
                'text' => $mark.' '.$eventKey->emoji().' '.$eventKey->label(),
                'callback_data' => 'admin:ev:t:'.$eventKey->value,
            ]];
        }

        $keyboard[] = [
            ['text' => '🆔 چت‌های گیرنده', 'callback_data' => 'admin:ev:cid'],
            ['text' => '🧪 ارسال آزمایشی', 'callback_data' => 'admin:ev:test'],
        ];
        $keyboard[] = [['text' => '🏠 داشبورد', 'callback_data' => 'admin:h']];

        $this->editOrSend($client, $chatId, $messageId, $text, ['inline_keyboard' => $keyboard], ['parse_mode' => 'Markdown']);
    }
}
