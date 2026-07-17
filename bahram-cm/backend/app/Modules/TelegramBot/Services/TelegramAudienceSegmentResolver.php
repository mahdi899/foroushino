<?php

namespace App\Modules\TelegramBot\Services;

use App\Enums\ReferralConversionStatus;
use App\Modules\TelegramBot\Models\TelegramAccount;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class TelegramAudienceSegmentResolver
{
    public const SEGMENTS = [
        'all_bot_users' => 'همه کاربران بات',
        'course_buyers' => 'خریداران دوره',
        'no_purchase' => 'بدون خرید دوره',
        'seminar_attendees' => 'شرکت‌کنندگان سمینار',
        'sat_submitted' => 'ثبت‌کننده سات',
        'sat_not_submitted' => 'بدون ثبت سات',
        'incomplete_profiles' => 'پروفایل ناقص',
        'successful_referrers' => 'معرف‌های موفق',
    ];

    /** @return array<string, string> */
    public function labels(): array
    {
        return self::SEGMENTS;
    }

    public function label(string $segmentKey): string
    {
        return self::SEGMENTS[$segmentKey] ?? $segmentKey;
    }

    /** @return Collection<int, TelegramAccount> */
    public function accounts(int $telegramBotId, ?string $segmentKey): Collection
    {
        $key = $segmentKey ?: 'all_bot_users';
        if (! array_key_exists($key, self::SEGMENTS)) {
            $key = 'all_bot_users';
        }

        $base = TelegramAccount::query()
            ->where('telegram_bot_id', $telegramBotId)
            ->where('is_blocked', false);

        if ($key === 'all_bot_users') {
            return $base->orderBy('id')->get();
        }

        $query = $this->applySegment($base, $key);

        return $query->orderBy('id')->get();
    }

    public function count(int $telegramBotId, ?string $segmentKey): int
    {
        return $this->accounts($telegramBotId, $segmentKey)->count();
    }

    private function applySegment(Builder $base, string $key): Builder
    {
        return match ($key) {
            'course_buyers' => $base->whereNotNull('user_id')->whereHas('user.courseAccesses'),
            'no_purchase' => $base->whereNotNull('user_id')->whereDoesntHave('user.courseAccesses'),
            'seminar_attendees' => $base->whereNotNull('user_id')->whereHas('user.seminarAttendances'),
            'sat_submitted' => $base->whereNotNull('user_id')->whereHas('user.satApplications'),
            'sat_not_submitted' => $base->whereNotNull('user_id')->whereDoesntHave('user.satApplications'),
            'incomplete_profiles' => $base->whereNotNull('user_id')->whereDoesntHave('user.profile'),
            'successful_referrers' => $base->whereNotNull('user_id')->whereHas(
                'user.referralConversionsAsReferrer',
                fn ($q) => $q->where('status', ReferralConversionStatus::Approved)
            ),
            default => $base,
        };
    }
}
