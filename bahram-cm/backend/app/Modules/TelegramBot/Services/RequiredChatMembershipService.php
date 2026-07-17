<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Jobs\SendTelegramMessageJob;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramRequiredChat;
use App\Modules\TelegramBot\Support\TelegramChatIdResolver;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

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
                'is_member' => $this->isMember($bot, $account->telegram_user_id, $chat),
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
        $missing = 0;

        foreach ($results as $result) {
            if ($result['is_member']) {
                continue;
            }

            $missing++;
            /** @var TelegramRequiredChat $chat */
            $chat = $result['chat'];
            $url = $chat->invite_link;
            if ($url) {
                $buttons[] = [['text' => 'عضویت: '.$chat->title, 'url' => $url]];
            }
        }

        if ($missing === 0) {
            return;
        }

        $buttons[] = [['text' => 'عضو شدم؛ بررسی همه کانال‌ها', 'callback_data' => 'membership:recheck']];

        $message = 'برای ادامه استفاده از ربات، در کانال‌های اجباری عضو شوید.';
        if ($this->hasUnverifiableRequiredChats($bot)) {
            $message = "برای ادامه، در کانال‌های اجباری عضو شوید.\n\n"
                ."اگر عضو هستید ولی باز این پیام را می‌بینید، احتمالاً ربات هنوز در کانال ادمین نشده — به مدیر سایت اطلاع دهید.";
        }

        SendTelegramMessageJob::dispatch(
            $bot->id,
            $account->telegram_user_id,
            $message,
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
            ->get();

        foreach ($chats as $chat) {
            Cache::forget(sprintf(
                'telegram:membership:%d:%s:%d',
                $bot->id,
                $chat->resolvedChatId(),
                $telegramUserId,
            ));
        }
    }

    public function isMember(TelegramBot $bot, int $telegramUserId, TelegramRequiredChat|string $chat): bool
    {
        $chatId = $chat instanceof TelegramRequiredChat ? $chat->resolvedChatId() : (string) $chat;
        $cacheKey = sprintf('telegram:membership:%d:%s:%d', $bot->id, $chatId, $telegramUserId);
        $ttl = (int) config('telegram_bot.membership_cache_seconds', 300);

        if (Cache::has($cacheKey)) {
            return (bool) Cache::get($cacheKey);
        }

        try {
            $member = $this->clientFactory->forBot($bot)->getChatMember($chatId, $telegramUserId);
            $status = (string) ($member['status'] ?? 'left');
            $isMember = in_array($status, self::MEMBER_STATUSES, true);
            Cache::put($cacheKey, $isMember, $ttl);

            return $isMember;
        } catch (\Throwable $e) {
            Log::channel('telegram')->warning('getChatMember failed for required chat.', [
                'bot_id' => $bot->id,
                'chat_id' => $chatId,
                'telegram_user_id' => $telegramUserId,
                'error' => $e->getMessage(),
            ]);

            if ($this->isVerificationUnavailableError($e) && $this->shouldRelaxWhenUnverifiable()) {
                Log::channel('telegram')->info('Membership check relaxed in local dev because bot cannot verify channel membership.', [
                    'bot_id' => $bot->id,
                    'chat_id' => $chatId,
                    'telegram_user_id' => $telegramUserId,
                ]);

                return true;
            }

            return false;
        }
    }

    public function resolveAndSyncChatId(TelegramBot $bot, string $chatId, ?string $inviteLink = null): string
    {
        $resolved = TelegramChatIdResolver::resolve($chatId, $inviteLink);

        try {
            $chat = $this->clientFactory->forBot($bot)->getChat($resolved);
            $numericId = (string) ($chat['id'] ?? '');

            if (preg_match('/^-100\d+$/', $numericId)) {
                return $numericId;
            }
        } catch (\Throwable $e) {
            Log::channel('telegram')->warning('getChat failed while resolving required chat id.', [
                'bot_id' => $bot->id,
                'chat_id' => $resolved,
                'error' => $e->getMessage(),
            ]);
        }

        return $resolved;
    }

    public function assertBotCanVerifyMembership(TelegramBot $bot, string $chatId): void
    {
        if ($this->shouldRelaxWhenUnverifiable()) {
            return;
        }

        try {
            $this->clientFactory->forBot($bot)->getChatAdministrators($chatId);
        } catch (\Throwable $e) {
            if ($this->isVerificationUnavailableError($e)) {
                abort(422, 'ربات باید در این کانال/گروه ادمین باشد تا بتواند عضویت کاربران را بررسی کند. ابتدا ربات را به کانال اضافه و ادمین کنید.');
            }

            abort(422, 'شناسه کانال/گروه معتبر نیست یا ربات به آن دسترسی ندارد.');
        }
    }

    public function hasUnverifiableRequiredChats(TelegramBot $bot): bool
    {
        if ($this->shouldRelaxWhenUnverifiable()) {
            return false;
        }

        $chats = TelegramRequiredChat::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('is_active', true)
            ->where('is_required', true)
            ->get();

        foreach ($chats as $chat) {
            try {
                $this->clientFactory->forBot($bot)->getChatAdministrators($chat->resolvedChatId());
            } catch (\Throwable $e) {
                if ($this->isVerificationUnavailableError($e)) {
                    return true;
                }
            }
        }

        return false;
    }

    private function isVerificationUnavailableError(\Throwable $e): bool
    {
        return str_contains($e->getMessage(), 'member list is inaccessible');
    }

    private function shouldRelaxWhenUnverifiable(): bool
    {
        return config('bahram.otp.dev_mode') && app()->environment('local', 'testing');
    }
}
