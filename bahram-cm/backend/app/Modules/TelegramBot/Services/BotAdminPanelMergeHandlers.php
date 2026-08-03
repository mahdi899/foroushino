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
use RuntimeException;

/** Admin bot handlers for destination mobile merge + host soft reregister. */
trait BotAdminPanelMergeHandlers
{
    private function handleDestinationMergeCallback(
        TelegramBot $bot,
        TelegramAccount $account,
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        string $data,
    ): void {
        if (! $account->hasBotAdminPermission(BotAdminPermission::UserInfo)
            && ! $account->isPermanentBotAdmin()) {
            throw new RuntimeException('دسترسی «اطلاعات کاربر» لازم است.');
        }

        $parts = explode(':', $data);
        $action = $parts[2] ?? 'list';

        if ($action === 'list') {
            $this->renderDestinationMergeList($client, $chatId, $messageId);

            return;
        }

        if ($action === 'add') {
            $conversation = $this->conversations->forAccount($account);
            $this->conversations->transition($conversation, ConversationState::AdminWaitingInput, [
                'admin' => ['flow' => 'dm_add_canonical', 'draft' => []],
            ]);
            $client->sendMessage(
                $chatId,
                "🔗 ادغام خط مقاصد\n\nشماره **پایه (سفارش)** را بفرستید:\nمثال: `09121234567`\n\nبرای انصراف «لغو».",
                [
                    'parse_mode' => 'Markdown',
                    'reply_markup' => ['keyboard' => [[['text' => 'لغو']]], 'resize_keyboard' => true],
                ],
            );

            return;
        }

        $mergeId = (int) ($parts[3] ?? 0);
        $merge = TelegramDestinationMobileMerge::query()->find($mergeId);
        if ($merge === null) {
            throw new RuntimeException('درخواست ادغام یافت نشد.');
        }

        $actorUserId = $account->user_id ? (int) $account->user_id : null;
        $mergeService = app(DestinationMobileMergeService::class);

        if ($action === 'approve') {
            $mergeService->approve($merge, $actorUserId);
            $this->renderDestinationMergeList($client, $chatId, $messageId, '✅ ادغام تأیید و به هاست push شد.');

            return;
        }

        if ($action === 'reject') {
            $mergeService->reject($merge);
            $this->renderDestinationMergeList($client, $chatId, $messageId, 'درخواست رد شد.');

            return;
        }

        if ($action === 'revoke') {
            $mergeService->revoke($merge, $actorUserId);
            $this->renderDestinationMergeList($client, $chatId, $messageId, 'ادغام لغو شد.');

            return;
        }

        $this->renderDestinationMergeList($client, $chatId, $messageId);
    }

    private function renderDestinationMergeList(
        TelegramBotClientInterface $client,
        int $chatId,
        int $messageId,
        ?string $notice = null,
    ): void {
        $pending = TelegramDestinationMobileMerge::query()
            ->where('status', TelegramDestinationMobileMerge::STATUS_PENDING)
            ->orderByDesc('id')
            ->limit(10)
            ->get();

        $approved = TelegramDestinationMobileMerge::query()
            ->where('status', TelegramDestinationMobileMerge::STATUS_APPROVED)
            ->orderByDesc('approved_at')
            ->limit(10)
            ->get();

        $lines = [];
        if ($notice) {
            $lines[] = $notice;
            $lines[] = '';
        }
        $lines[] = '🔗 ادغام خط — فقط کانال‌های مقصد';
        $lines[] = 'شماره پایه → شماره فعال تلگرام';
        $lines[] = '';

        if ($pending->isNotEmpty()) {
            $lines[] = '🟡 در انتظار تأیید:';
            foreach ($pending as $row) {
                $lines[] = "#{$row->id} پایه: {$row->canonical_mobile} → تلگرام: {$row->telegram_mobile}";
            }
            $lines[] = '';
        }

        if ($approved->isNotEmpty()) {
            $lines[] = '🟢 تأییدشده:';
            foreach ($approved as $row) {
                $lines[] = "#{$row->id} {$row->canonical_mobile} → {$row->telegram_mobile}";
            }
        }

        if ($pending->isEmpty() && $approved->isEmpty()) {
            $lines[] = 'هنوز ادغامی ثبت نشده.';
        }

        $keyboard = [
            [['text' => '➕ درخواست ادغام', 'callback_data' => 'admin:dm:add']],
        ];

        foreach ($pending as $row) {
            $keyboard[] = [
                ['text' => "✅ #{$row->id}", 'callback_data' => 'admin:dm:approve:'.$row->id],
                ['text' => "❌ #{$row->id}", 'callback_data' => 'admin:dm:reject:'.$row->id],
            ];
        }

        foreach ($approved as $row) {
            $keyboard[] = [
                ['text' => "🗑️ لغو #{$row->id}", 'callback_data' => 'admin:dm:revoke:'.$row->id],
            ];
        }

        $keyboard[] = [['text' => '🏠 داشبورد', 'callback_data' => 'admin:h']];

        $this->editOrSend($client, $chatId, $messageId, implode("\n", $lines), [
            'inline_keyboard' => $keyboard,
        ]);
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
            "شماره پایه: {$mobile}\n\nحالا **شماره فعال تلگرام** را بفرستید:\n(شماره‌ای که کاربر در ربات share کرده)",
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
            "درخواست ادغام #{$merge->id} ثبت شد.\n"
            ."پایه: {$merge->canonical_mobile}\n"
            ."تلگرام: {$merge->telegram_mobile}\n\n"
            .'از «ادغام خط مقاصد» تأیید کنید.',
            ['reply_markup' => $this->adminMenuMarkup($account)],
        );
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
                ['text' => '✅ تأیید ریست', 'callback_data' => 'admin:u:rhostc:'.$target->id],
                ['text' => '❌ انصراف', 'callback_data' => 'admin:u:i:'.$target->id],
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
