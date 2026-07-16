<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Jobs\SendTelegramMessageJob;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramRequiredChat;
use Illuminate\Support\Facades\Cache;

class RequiredChatMembershipService
{
    private const MEMBER_STATUSES = ['member', 'administrator', 'creator', 'restricted'];

    public function __construct(
        private readonly TelegramBotClientFactory $clientFactory,
    ) {}

    /** @return list<array{chat: TelegramRequiredChat, is_member: bool}> */
    public function checkAll(TelegramBot $bot, TelegramAccount $account): array
    {
        $chats = TelegramRequiredChat::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('is_active', true)
            ->where('is_required', true)
            ->orderBy('sort_order')
            ->get();

        $results = [];

        foreach ($chats as $chat) {
            $results[] = [
                'chat' => $chat,
                'is_member' => $this->isMember($bot, $account->telegram_user_id, $chat->chat_id),
            ];
        }

        return $results;
    }

    public function allRequiredJoined(TelegramBot $bot, TelegramAccount $account): bool
    {
        foreach ($this->checkAll($bot, $account) as $result) {
            if (! $result['is_member']) {
                return false;
            }
        }

        return true;
    }

    public function isSatisfied(TelegramBot $bot, TelegramAccount $account): bool
    {
        return $this->allRequiredJoined($bot, $account);
    }

    public function promptJoin(TelegramBot $bot, TelegramAccount $account): void
    {
        $results = $this->checkAll($bot, $account);
        $buttons = [];

        foreach ($results as $result) {
            if ($result['is_member']) {
                continue;
            }

            /** @var TelegramRequiredChat $chat */
            $chat = $result['chat'];
            $url = $chat->invite_link;
            if ($url) {
                $buttons[] = [['text' => 'عضویت: '.$chat->title, 'url' => $url]];
            }
        }

        $buttons[] = [['text' => 'عضو شدم؛ بررسی همه کانال‌ها', 'callback_data' => 'membership:recheck']];

        SendTelegramMessageJob::dispatch(
            $bot->id,
            $account->telegram_user_id,
            'برای ادامه استفاده از ربات، در کانال‌های اجباری عضو شوید.',
            [
                'reply_markup' => ['inline_keyboard' => $buttons],
            ],
        )->onQueue(config('telegram_bot.queues.replies'));
    }

    public function invalidateCache(TelegramBot $bot, int $telegramUserId, ?string $chatId = null): void
    {
        if ($chatId !== null) {
            Cache::forget(sprintf('telegram:membership:%d:%s:%d', $bot->id, $chatId, $telegramUserId));

            return;
        }

        $chats = TelegramRequiredChat::query()
            ->where('telegram_bot_id', $bot->id)
            ->pluck('chat_id');

        foreach ($chats as $id) {
            Cache::forget(sprintf('telegram:membership:%d:%s:%d', $bot->id, $id, $telegramUserId));
        }
    }

    public function isMember(TelegramBot $bot, int $telegramUserId, string $chatId): bool
    {
        $cacheKey = sprintf('telegram:membership:%d:%s:%d', $bot->id, $chatId, $telegramUserId);
        $ttl = (int) config('telegram_bot.membership_cache_seconds', 300);

        return (bool) Cache::remember($cacheKey, $ttl, function () use ($bot, $telegramUserId, $chatId): bool {
            try {
                $member = $this->clientFactory->forBot($bot)->getChatMember($chatId, $telegramUserId);
                $status = (string) ($member['status'] ?? 'left');

                return in_array($status, self::MEMBER_STATUSES, true);
            } catch (\Throwable) {
                return false;
            }
        });
    }
}
