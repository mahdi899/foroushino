<?php

namespace App\Modules\TelegramBot\Services;

use App\Models\CourseAccess;
use App\Services\Sat\SatParticipantAccessService;
use App\Modules\TelegramBot\Models\TelegramAccessDenial;
use App\Modules\TelegramBot\Models\TelegramAccessGrant;
use App\Modules\TelegramBot\Models\TelegramDestination;
use App\Modules\TelegramBot\Models\TelegramDestinationRequirement;

class DestinationAccessPolicy
{
    /**
     * @return array{allowed: bool, reason: string}
     */
    public function evaluate(TelegramDestination $destination, ?int $userId): array
    {
        if (! $destination->is_active) {
            return ['allowed' => false, 'reason' => 'مقصد غیرفعال است.'];
        }

        if ($userId === null) {
            return ['allowed' => false, 'reason' => 'ابتدا در ربات ثبت‌نام کنید.'];
        }

        if (TelegramAccessDenial::query()
            ->where('telegram_destination_id', $destination->id)
            ->where('user_id', $userId)
            ->exists()) {
            return ['allowed' => false, 'reason' => 'دسترسی شما به این مقصد مسدود شده است.'];
        }

        if (TelegramAccessGrant::query()
            ->where('telegram_destination_id', $destination->id)
            ->where('user_id', $userId)
            ->where(function ($q): void {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->exists()) {
            return ['allowed' => true, 'reason' => 'manual_grant'];
        }

        $requirements = TelegramDestinationRequirement::query()
            ->where('telegram_destination_id', $destination->id)
            ->get();

        if ($requirements->isEmpty()) {
            return ['allowed' => false, 'reason' => 'شرایط دسترسی تعریف نشده است.'];
        }

        $byGroup = $requirements->groupBy(fn ($r) => $r->group_key ?: 'default');

        foreach ($byGroup as $group) {
            $operator = (string) ($group->first()->operator ?? 'all');
            $results = $group->map(fn ($req) => $this->matchesRequirement($req, $userId));

            $ok = $operator === 'any'
                ? $results->contains(true)
                : $results->every(fn ($v) => $v === true);

            if (! $ok) {
                return ['allowed' => false, 'reason' => 'شرایط دسترسی برقرار نیست.'];
            }
        }

        return ['allowed' => true, 'reason' => 'requirements_met'];
    }

    private function matchesRequirement(TelegramDestinationRequirement $req, int $userId): bool
    {
        return match ($req->requirement_type) {
            'product', 'active_course_access' => CourseAccess::query()
                ->where('user_id', $userId)
                ->where('product_id', (int) $req->requirement_value)
                ->where('status', 'active')
                ->exists(),
            'sat_membership' => app(SatParticipantAccessService::class)->hasOpenedAccessByUserId($userId),
            'manual_grant' => true,
            default => false,
        };
    }
}
