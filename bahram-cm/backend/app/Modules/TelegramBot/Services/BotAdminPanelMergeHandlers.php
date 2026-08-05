<?php

namespace App\Modules\TelegramBot\Services;

use App\Models\User;
use App\Modules\TelegramBot\Contracts\TelegramBotClientInterface;
use App\Modules\TelegramBot\Enums\BotAdminPermission;
use App\Modules\TelegramBot\Enums\ConversationState;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramConversation;
use App\Modules\TelegramBot\Models\TelegramDestinationMobileMerge;
use App\Services\TelegramHostReregisterService;
use App\Support\Mobile;
use Illuminate\Database\Eloquent\Builder;
use RuntimeException;

/** Admin bot handlers for destination mobile merge + host soft reregister. */
trait BotAdminPanelMergeHandlers
{
    private const MERGES_PER_PAGE = 10;

    private function assertDestinationMergeAccess(TelegramAccount $account): void
    {
        if (! $account->hasBotAdminPermission(BotAdminPermission::UserInfo)
            && ! $account->isPermanentBotAdmin()) {
            throw new RuntimeException('دسترسی «اطلاعات کاربر» لازم است.');
        }
    }

    /** @return array{text: string, callback_data: string, style?: string} */
    private function dmInlineBtn(string $text, string $callbackData, ?string $style = null): array
    {
        $button = ['text' => $text, 'callback_data' => $callbackData];
        if ($style !== null) {
            $button['style'] = $style;
        }

        return $button;
    }

    private function destinationMergeStatusLabel(string $status): string
    {
        return match ($status) {
            TelegramDestinationMobileMerge::STATUS_PENDING => '🟡 در انتظار تأیید',
            TelegramDestinationMobileMerge::STATUS_APPROVED => '🟢 تأییدشده',
            TelegramDestinationMobileMerge::STATUS_REVOKED => '⛔ لغو / رد',
            default => $status,
        };
    }

    private function formatDestinationMergeSummary(TelegramDestinationMobileMerge $merge, ?string $notice = null): string
    {
        $lines = [];
        if ($notice !== null && $notice !== '') {
            $lines[] = $notice;
            $lines[] = '';
        }

        $lines[] = '🔗 ادغام خط مقاصد';
        $lines[] = "شناسه: #{$merge->id}";
        $lines[] = 'وضعیت: '.$this->destinationMergeStatusLabel((string) $merge->status);
        $lines[] = "پایه (سفارش): {$merge->canonical_mobile}";
        $lines[] = "تلگرام (مقصد): {$merge->telegram_mobile}";

        return implode("\n", $lines);
    }

    /** @return list<list<array<string, mixed>>> */
    private function destinationMergeActionRows(TelegramDestinationMobileMerge $merge): array
    {
        $id = (int) $merge->id;
        $rows = [];

        if ($merge->isPending()) {
            $rows[] = [
                $this->dmInlineBtn('✅ تأیید', 'admin:dm:approve:'.$id, 'success'),
                $this->dmInlineBtn('❌ رد', 'admin:dm:reject:'.$id, 'danger'),
            ];
        }

        if ($merge->isApproved()) {
            $rows[] = [
                $this->dmInlineBtn('🗑️ لغو ادغام', 'admin:dm:revoke:'.$id, 'danger'),
            ];
        }

        $rows[] = [
            $this->dmInlineBtn('📋 لیست ادغام‌ها', 'admin:dm:p:0', 'primary'),
            $this->dmInlineBtn('◀️ منوی ادغام', 'admin:dm:hub', 'primary'),
        ];

        return $rows;
    }

    private function handleDestinationMergeCallback(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        string $data,
    ): void {
        $this->assertDestinationMergeAccess($account);

        $parts = explode(':', $data);
        $action = $parts[2] ?? 'hub';

        if ($action === 'hub' || $action === 'list') {
            $this->renderDestinationMergeHub($client, $chatId, $messageId);

            return;
        }

        if ($action === 'add') {
            $conversation = $this->conversations->forAccount($account);
            $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
                'admin' => ['flow' => 'dm_add_canonical', 'draft' => []],
            ]);
            $client->sendMessage(
                $chatId,
                "➕ ثبت ادغام جدید\n\n"
                ."شماره **پایه (سفارش)** را بفرستید:\n"
                ."مثال: `09121234567`\n\n"
                .'برای انصراف «لغو».',
                [
                    'parse_mode' => 'Markdown',
                    'reply_markup' => ['keyboard' => [[['text' => 'لغو']]], 'resize_keyboard' => true],
                ],
            );

            return;
        }

        if ($action === 'srch') {
            $conversation = $this->conversations->forAccount($account);
            $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
                'admin' => ['flow' => 'dm_search', 'draft' => []],
            ]);
            $client->sendMessage(
                $chatId,
                "🔍 جستجوی ادغام\n\n"
                ."شناسه عددی ادغام یا شماره موبایل را بفرستید.\n"
                ."مثال: `2` یا `09014350773`\n\n"
                .'برای انصراف «لغو».',
                [
                    'parse_mode' => 'Markdown',
                    'reply_markup' => ['keyboard' => [[['text' => 'لغو']]], 'resize_keyboard' => true],
                ],
            );

            return;
        }

        if ($action === 'p') {
            $page = max(0, (int) ($parts[3] ?? 0));
            $this->renderDestinationMergePage($client, $chatId, $messageId, $page);

            return;
        }

        $mergeId = (int) ($parts[3] ?? 0);
        $merge = TelegramDestinationMobileMerge::query()->find($mergeId);
        if ($merge === null) {
            throw new RuntimeException('درخواست ادغام یافت نشد.');
        }

        $actorUserId = $account->user_id ? (int) $account->user_id : null;
        $mergeService = app(DestinationMobileMergeService::class);

        if ($action === 'i') {
            $this->renderDestinationMergeDetail($client, $chatId, $messageId, $merge);

            return;
        }

        if ($action === 'approve') {
            $mergeService->approve($merge, $actorUserId);
            $fresh = $merge->fresh() ?? $merge;
            $this->editOrSend(
                $client,
                $chatId,
                $messageId,
                $this->formatDestinationMergeSummary($fresh, '✅ ادغام تأیید و به هاست push شد.'),
                ['inline_keyboard' => $this->destinationMergeActionRows($fresh)],
            );

            return;
        }

        if ($action === 'reject') {
            $mergeService->reject($merge);
            $fresh = $merge->fresh() ?? $merge;
            $this->editOrSend(
                $client,
                $chatId,
                $messageId,
                $this->formatDestinationMergeSummary($fresh, '❌ درخواست رد شد.'),
                ['inline_keyboard' => $this->destinationMergeActionRows($fresh)],
            );

            return;
        }

        if ($action === 'revoke') {
            $mergeService->revoke($merge, $actorUserId);
            $fresh = $merge->fresh() ?? $merge;
            $this->editOrSend(
                $client,
                $chatId,
                $messageId,
                $this->formatDestinationMergeSummary($fresh, '🗑️ ادغام لغو شد.'),
                ['inline_keyboard' => $this->destinationMergeActionRows($fresh)],
            );

            return;
        }

        $this->renderDestinationMergeHub($client, $chatId, $messageId);
    }

    private function renderDestinationMergeHub(
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        ?string $notice = null,
    ): void {
        $pending = TelegramDestinationMobileMerge::query()
            ->where('status', TelegramDestinationMobileMerge::STATUS_PENDING)
            ->count();
        $approved = TelegramDestinationMobileMerge::query()
            ->where('status', TelegramDestinationMobileMerge::STATUS_APPROVED)
            ->count();

        $lines = [];
        if ($notice !== null && $notice !== '') {
            $lines[] = $notice;
            $lines[] = '';
        }

        $lines[] = '🔗 ادغام خط مقاصد';
        $lines[] = 'شماره پایه (سفارش) → شماره فعال تلگرام';
        $lines[] = 'فقط برای دسترسی کانال‌های مقصد.';
        $lines[] = '';
        $lines[] = "🟡 در انتظار: {$pending} · 🟢 فعال: {$approved}";

        $keyboard = [
            [$this->dmInlineBtn('➕ ثبت ادغام جدید', 'admin:dm:add', 'primary')],
            [
                $this->dmInlineBtn('📋 لیست ادغام‌ها', 'admin:dm:p:0', 'primary'),
                $this->dmInlineBtn('🔍 جستجو', 'admin:dm:srch', 'primary'),
            ],
            [$this->dmInlineBtn('🏠 داشبورد', 'admin:h', 'primary')],
        ];

        $this->editOrSend($client, $chatId, $messageId, implode("\n", $lines), [
            'inline_keyboard' => $keyboard,
        ]);
    }

    private function renderDestinationMergePage(
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        int $page,
        ?string $notice = null,
    ): void {
        $total = TelegramDestinationMobileMerge::query()->count();
        $totalPages = max(1, (int) ceil($total / self::MERGES_PER_PAGE));
        $page = min($page, $totalPages - 1);

        $items = TelegramDestinationMobileMerge::query()
            ->orderByDesc('id')
            ->skip($page * self::MERGES_PER_PAGE)
            ->take(self::MERGES_PER_PAGE)
            ->get();

        $lines = [];
        if ($notice !== null && $notice !== '') {
            $lines[] = $notice;
            $lines[] = '';
        }

        $lines[] = '📋 لیست ادغام‌ها';
        $lines[] = 'صفحه '.($page + 1).' از '.$totalPages.' · '.$total.' مورد';
        $lines[] = '';

        if ($items->isEmpty()) {
            $lines[] = 'هنوز ادغامی ثبت نشده.';
        } else {
            foreach ($items as $row) {
                $lines[] = "#{$row->id} · {$this->destinationMergeStatusLabel((string) $row->status)}";
                $lines[] = "   {$row->canonical_mobile} → {$row->telegram_mobile}";
            }
        }

        $keyboard = [];

        foreach ($items as $row) {
            if ($row->isPending()) {
                $keyboard[] = [
                    $this->dmInlineBtn('✅ #'.$row->id, 'admin:dm:approve:'.$row->id, 'success'),
                    $this->dmInlineBtn('❌ #'.$row->id, 'admin:dm:reject:'.$row->id, 'danger'),
                    $this->dmInlineBtn('📄', 'admin:dm:i:'.$row->id, 'primary'),
                ];
            } elseif ($row->isApproved()) {
                $keyboard[] = [
                    $this->dmInlineBtn('🗑️ لغو #'.$row->id, 'admin:dm:revoke:'.$row->id, 'danger'),
                    $this->dmInlineBtn('📄 #'.$row->id, 'admin:dm:i:'.$row->id, 'primary'),
                ];
            } else {
                $keyboard[] = [
                    $this->dmInlineBtn('📄 #'.$row->id, 'admin:dm:i:'.$row->id, 'primary'),
                ];
            }
        }

        $nav = [];
        if ($page > 0) {
            $nav[] = $this->dmInlineBtn('◀️ قبلی', 'admin:dm:p:'.($page - 1), 'primary');
        }
        if ($page + 1 < $totalPages) {
            $nav[] = $this->dmInlineBtn('▶️ بعدی', 'admin:dm:p:'.($page + 1), 'primary');
        }
        if ($nav !== []) {
            $keyboard[] = $nav;
        }

        $keyboard[] = [
            $this->dmInlineBtn('🔍 جستجو', 'admin:dm:srch', 'primary'),
            $this->dmInlineBtn('◀️ منوی ادغام', 'admin:dm:hub', 'primary'),
        ];

        $this->editOrSend($client, $chatId, $messageId, implode("\n", $lines), [
            'inline_keyboard' => $keyboard,
        ]);
    }

    private function renderDestinationMergeDetail(
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        TelegramDestinationMobileMerge $merge,
        ?string $notice = null,
    ): void {
        $this->editOrSend(
            $client,
            $chatId,
            $messageId,
            $this->formatDestinationMergeSummary($merge, $notice),
            ['inline_keyboard' => $this->destinationMergeActionRows($merge)],
        );
    }

    private function onDestinationMergeCanonicalInput(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
    ): void {
        $mobile = Mobile::normalize($text);
        if ($mobile === null) {
            throw new RuntimeException('شماره پایه نامعتبر است.');
        }

        $user = User::query()->where('mobile', $mobile)->first();
        if ($user === null) {
            throw new RuntimeException('کاربر سایت با این شماره پایه یافت نشد.');
        }

        $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
            'admin' => [
                'flow' => 'dm_add_telegram',
                'draft' => ['canonical_mobile' => $mobile],
            ],
        ]);

        $client->sendMessage(
            $chatId,
            "شماره پایه: {$mobile}\n\n"
            ."حالا **شماره مقصد (تلگرام)** را بفرستید:\n"
            .'(شماره‌ای که کاربر در ربات share کرده)',
            ['parse_mode' => 'Markdown', 'reply_markup' => $this->adminMenuMarkup($account)],
        );
    }

    private function onDestinationMergeTelegramInput(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
    ): void {
        $canonical = (string) data_get($conversation->context, 'admin.draft.canonical_mobile', '');
        $telegramMobile = Mobile::normalize($text);
        if ($telegramMobile === null) {
            throw new RuntimeException('شماره تلگرام نامعتبر است.');
        }

        $merge = app(DestinationMobileMergeService::class)->propose(
            $canonical,
            $telegramMobile,
            null,
            $account->user_id ? (int) $account->user_id : null,
        );

        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);

        $client->sendMessage(
            $chatId,
            $this->formatDestinationMergeSummary($merge, '✅ درخواست ثبت شد. تأیید یا رد کنید:'),
            [
                'reply_markup' => [
                    'inline_keyboard' => [
                        [
                            $this->dmInlineBtn('✅ تأیید', 'admin:dm:approve:'.$merge->id, 'success'),
                            $this->dmInlineBtn('❌ رد', 'admin:dm:reject:'.$merge->id, 'danger'),
                        ],
                        [
                            $this->dmInlineBtn('📋 لیست ادغام‌ها', 'admin:dm:p:0', 'primary'),
                            $this->dmInlineBtn('◀️ منوی ادغام', 'admin:dm:hub', 'primary'),
                        ],
                    ],
                ],
            ],
        );
        $client->sendMessage($chatId, 'منوی پنل ادمین پایین صفحه فعال است.', [
            'reply_markup' => $this->adminMenuMarkup($account),
        ]);
    }

    private function onDestinationMergeSearchInput(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramConversation $conversation,
        TelegramBotClientInterface $client,
        int $chatId,
        string $text,
    ): void {
        $query = trim($text);
        $this->conversations->transition($conversation, ConversationState::AdminPanel, [
            'admin' => ['flow' => null, 'draft' => []],
        ]);

        if (ctype_digit($query)) {
            $merge = TelegramDestinationMobileMerge::query()->find((int) $query);
            if ($merge === null) {
                throw new RuntimeException('ادغام با این شناسه یافت نشد.');
            }

            $client->sendMessage(
                $chatId,
                $this->formatDestinationMergeSummary($merge),
                ['reply_markup' => ['inline_keyboard' => $this->destinationMergeActionRows($merge)]],
            );

            return;
        }

        $mobile = Mobile::normalize($query);
        if ($mobile === null) {
            throw new RuntimeException('شناسه یا شماره نامعتبر است.');
        }

        $matches = TelegramDestinationMobileMerge::query()
            ->where(function (Builder $q) use ($mobile): void {
                $q->where('canonical_mobile', $mobile)
                    ->orWhere('telegram_mobile', $mobile);
            })
            ->orderByDesc('id')
            ->limit(10)
            ->get();

        if ($matches->isEmpty()) {
            throw new RuntimeException('ادغامی با این شماره یافت نشد.');
        }

        if ($matches->count() === 1) {
            $merge = $matches->first();
            $client->sendMessage(
                $chatId,
                $this->formatDestinationMergeSummary($merge),
                ['reply_markup' => ['inline_keyboard' => $this->destinationMergeActionRows($merge)]],
            );

            return;
        }

        $lines = ['🔍 چند ادغام پیدا شد — یکی را انتخاب کنید:'];
        $keyboard = [];
        foreach ($matches as $row) {
            $lines[] = "#{$row->id} · {$this->destinationMergeStatusLabel((string) $row->status)}";
            $lines[] = "   {$row->canonical_mobile} → {$row->telegram_mobile}";
            $keyboard[] = [
                $this->dmInlineBtn('📄 #'.$row->id, 'admin:dm:i:'.$row->id, 'primary'),
            ];
        }
        $keyboard[] = [
            $this->dmInlineBtn('◀️ منوی ادغام', 'admin:dm:hub', 'primary'),
        ];

        $client->sendMessage($chatId, implode("\n", $lines), [
            'reply_markup' => ['inline_keyboard' => $keyboard],
        ]);
    }

    private function handleUserHostReregisterConfirm(
        TelegramBot $bot,
        TelegramAccount $actor,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        TelegramAccount $target,
    ): void {
        if (! $actor->hasBotAdminPermission(BotAdminPermission::UserInfo)
            && ! $actor->isPermanentBotAdmin()) {
            throw new RuntimeException('دسترسی «اطلاعات کاربر» لازم است.');
        }

        $mobile = $target->mobile ?? '—';
        $text = "🔄 ریست ثبت‌نام هاست\n\n"
            ."کاربر: #{$target->telegram_user_id}\n"
            ."موبایل فعلی: {$mobile}\n\n"
            ."• کش هاست پاک می‌شود\n"
            ."• موبایل تلگرام در ایران null می‌شود\n"
            ."• سفارش و دسترسی سایت **حفظ** می‌شود\n\n"
            .'تأیید می‌کنید؟';

        $keyboard = [
            [
                $this->dmInlineBtn('✅ تأیید ریست', 'admin:u:rhostc:'.$target->id, 'success'),
                $this->dmInlineBtn('❌ انصراف', 'admin:u:i:'.$target->id, 'danger'),
            ],
        ];

        $this->editOrSend($client, $chatId, $messageId, $text, ['inline_keyboard' => $keyboard]);
    }

    private function executeUserHostReregister(
        TelegramAccount $actor,
        TelegramBotClientInterface $client,
        int $chatId,
        TelegramAccount $target,
    ): void {
        if (! $actor->hasBotAdminPermission(BotAdminPermission::UserInfo)
            && ! $actor->isPermanentBotAdmin()) {
            throw new RuntimeException('دسترسی «اطلاعات کاربر» لازم است.');
        }

        $actorUser = $actor->user_id ? User::query()->find($actor->user_id) : null;
        $ok = app(TelegramHostReregisterService::class)->softReregister($target, $actorUser);

        $client->sendMessage(
            $chatId,
            $ok
                ? "✅ ریست انجام شد. کاربر #{$target->telegram_user_id} باید شماره جدید share کند."
                : '⚠️ ریست ایران انجام شد؛ push هاست ممکن است ناموفق بود (دوباره تلاش کنید).',
            ['reply_markup' => $this->adminMenuMarkup($actor)],
        );
    }
}
