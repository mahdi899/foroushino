<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class BotUsageStatsService
{
    /**
     * @return array{
     *   period: string,
     *   from: string,
     *   to: string,
     *   unique_users: int,
     *   new_users: int,
     *   updates_count: int
     * }
     */
    public function forPeriod(TelegramBot $bot, string $period): array
    {
        [$from, $to] = $this->rangeFor($period);

        return [
            'period' => $period,
            'from' => $from->toIso8601String(),
            'to' => $to->toIso8601String(),
            'unique_users' => $this->uniqueUsers($bot->id, $from, $to),
            'new_users' => TelegramAccount::query()
                ->where('telegram_bot_id', $bot->id)
                ->whereBetween('created_at', [$from, $to])
                ->count(),
            'updates_count' => TelegramUpdate::query()
                ->where('telegram_bot_id', $bot->id)
                ->whereBetween('created_at', [$from, $to])
                ->count(),
        ];
    }

    /**
     * @return array{day: array, week: array, month: array}
     */
    public function summary(TelegramBot $bot): array
    {
        return [
            'day' => $this->forPeriod($bot, 'day'),
            'week' => $this->forPeriod($bot, 'week'),
            'month' => $this->forPeriod($bot, 'month'),
        ];
    }

    public function formatSummaryText(TelegramBot $bot): string
    {
        $s = $this->summary($bot);

        return "📊 آمار بات «{$bot->display_name}»\n\n"
            ."📅 امروز\n"
            ."• کاربران یکتا: {$s['day']['unique_users']}\n"
            ."• کاربران جدید: {$s['day']['new_users']}\n"
            ."• پیام/آپدیت: {$s['day']['updates_count']}\n\n"
            ."📅 ۷ روز گذشته\n"
            ."• کاربران یکتا: {$s['week']['unique_users']}\n"
            ."• کاربران جدید: {$s['week']['new_users']}\n"
            ."• پیام/آپدیت: {$s['week']['updates_count']}\n\n"
            ."📅 ۳۰ روز گذشته\n"
            ."• کاربران یکتا: {$s['month']['unique_users']}\n"
            ."• کاربران جدید: {$s['month']['new_users']}\n"
            ."• پیام/آپدیت: {$s['month']['updates_count']}";
    }

    /** @return array{0: CarbonInterface, 1: CarbonInterface} */
    private function rangeFor(string $period): array
    {
        $to = now();

        $from = match ($period) {
            'day' => $to->copy()->startOfDay(),
            'week' => $to->copy()->subDays(7),
            'month' => $to->copy()->subDays(30),
            default => $to->copy()->startOfDay(),
        };

        return [$from, $to];
    }

    private function uniqueUsers(int $botId, CarbonInterface $from, CarbonInterface $to): int
    {
        // Extract from.id from common update payload shapes via JSON paths.
        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite') {
            return (int) TelegramUpdate::query()
                ->where('telegram_bot_id', $botId)
                ->whereBetween('created_at', [$from, $to])
                ->get()
                ->map(fn (TelegramUpdate $u) => $u->telegramUserId())
                ->filter()
                ->unique()
                ->count();
        }

        // MySQL / MariaDB
        $ids = TelegramUpdate::query()
            ->where('telegram_bot_id', $botId)
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw("COALESCE(
                JSON_UNQUOTE(JSON_EXTRACT(payload, '$.message.from.id')),
                JSON_UNQUOTE(JSON_EXTRACT(payload, '$.callback_query.from.id')),
                JSON_UNQUOTE(JSON_EXTRACT(payload, '$.edited_message.from.id')),
                JSON_UNQUOTE(JSON_EXTRACT(payload, '$.my_chat_member.from.id'))
            ) as uid")
            ->pluck('uid')
            ->filter(fn ($v) => $v !== null && $v !== '' && $v !== 'null')
            ->unique()
            ->count();

        return (int) $ids;
    }
}
