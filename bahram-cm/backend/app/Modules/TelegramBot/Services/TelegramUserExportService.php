<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use Illuminate\Support\Carbon;

class TelegramUserExportService
{
    /** @return list<int> */
    public function allowedDays(): array
    {
        return [7, 14, 30];
    }

    /**
     * Export accounts created in the last N days.
     *
     * @return array{filename: string, content: string, count: int}
     */
    public function exportTxt(TelegramBot $bot, int $days): array
    {
        $days = in_array($days, $this->allowedDays(), true) ? $days : 7;
        $from = now()->subDays($days);

        $accounts = TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('created_at', '>=', $from)
            ->orderBy('id')
            ->get();

        $lines = [
            '# خروجی کاربران بات '.$bot->key,
            '# بازه: '.$days.' روز گذشته (بر اساس تاریخ عضویت در بات)',
            '# از: '.$from->toDateTimeString().' تا: '.now()->toDateTimeString(),
            '# تعداد: '.$accounts->count(),
            '# ستون‌ها: telegram_user_id | username | display_name | mobile | created_at',
            '',
        ];

        foreach ($accounts as $account) {
            $lines[] = implode(' | ', [
                (string) $account->telegram_user_id,
                (string) ($account->telegram_username ?: '-'),
                str_replace(["\n", '|'], [' ', '/'], (string) ($account->display_name ?: trim(($account->first_name ?? '').' '.($account->last_name ?? '')) ?: '-')),
                (string) ($account->mobile ?: '-'),
                $account->created_at?->toDateTimeString() ?? '-',
            ]);
        }

        $content = implode("\n", $lines)."\n";
        $filename = sprintf('telegram-users-%s-%dd-%s.txt', $bot->key, $days, Carbon::now()->format('Ymd-His'));

        return [
            'filename' => $filename,
            'content' => $content,
            'count' => $accounts->count(),
        ];
    }
}
