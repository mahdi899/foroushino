<?php

namespace App\Modules\TelegramBot\Console;

use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Services\TelegramHostAccountSync;
use Illuminate\Console\Command;

class TelegramHostPushAccountCommand extends Command
{
    protected $signature = 'telegram:host-push-account
        {--telegram-user-id= : Telegram numeric user id}
        {--mobile= : Iran mobile (09…)}
        {--user-id= : Bahram user id}';

    protected $description = 'Push one production-bot account snapshot to the foreign Telegram host (KYC, purchases, presents).';

    public function handle(TelegramHostAccountSync $sync): int
    {
        $bot = TelegramBot::query()->where('key', 'production')->where('is_active', true)->first();
        if ($bot === null) {
            $this->error('Production Telegram bot not configured.');

            return self::FAILURE;
        }

        $query = TelegramAccount::query()->where('telegram_bot_id', $bot->id);

        $telegramUserId = (int) ($this->option('telegram-user-id') ?? 0);
        $userId = (int) ($this->option('user-id') ?? 0);
        $mobile = trim((string) ($this->option('mobile') ?? ''));

        if ($telegramUserId > 0) {
            $query->where('telegram_user_id', $telegramUserId);
        } elseif ($userId > 0) {
            $query->where('user_id', $userId);
        } elseif ($mobile !== '') {
            $query->where('mobile', $mobile);
        } else {
            $this->error('Provide --telegram-user-id, --user-id, or --mobile.');

            return self::FAILURE;
        }

        $account = $query->with(['user.identityProfile', 'bot'])->first();
        if ($account === null) {
            $this->error('Telegram account not found.');

            return self::FAILURE;
        }

        $level = (int) ($account->user?->identityProfile?->verification_level ?? 0);
        $ok = $sync->pushPaidOrderNotification(
            $account,
            '✅ اطلاعات حساب شما در ربات به‌روز شد.',
            [],
        );

        $this->info(sprintf(
            'telegram_user_id=%d user_id=%s level=%d push=%s',
            (int) $account->telegram_user_id,
            $account->user_id ?? 'null',
            $level,
            $ok ? 'ok' : 'queued/failed',
        ));

        return $ok ? self::SUCCESS : self::FAILURE;
    }
}
