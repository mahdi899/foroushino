<?php

namespace App\Services;

use App\Enums\NotificationKind;
use App\Models\Achievement;
use App\Models\User;
use App\Models\UserAchievement;

/**
 * Evaluates a small set of cumulative-counter achievements (calls made,
 * confirmed sales, login streak) whenever a relevant action happens, and
 * unlocks + notifies the agent the moment a threshold is first reached.
 */
class AchievementService
{
    public function __construct(private readonly NotificationService $notifications) {}

    /**
     * @return array<int, Achievement> newly unlocked achievements
     */
    public function evaluateCounters(User $user): array
    {
        $counters = [
            'first_call' => $user->calls()->count(),
            'hundred_calls' => $user->calls()->count(),
            'first_sale' => $user->sales()->where('status', 'confirmed')->count(),
            'ten_sales' => $user->sales()->where('status', 'confirmed')->count(),
            'fifty_sales' => $user->sales()->where('status', 'confirmed')->count(),
            'streak_7' => $user->streak,
            'streak_30' => $user->streak,
        ];

        $unlocked = [];

        foreach (Achievement::query()->whereIn('code', array_keys($counters))->get() as $achievement) {
            $progress = $counters[$achievement->code];
            $result = $this->recordProgress($user, $achievement, $progress);
            if ($result) {
                $unlocked[] = $achievement;
            }
        }

        return $unlocked;
    }

    public function unlock(User $user, string $code): ?Achievement
    {
        $achievement = Achievement::query()->where('code', $code)->first();
        if (! $achievement) {
            return null;
        }

        return $this->recordProgress($user, $achievement, $achievement->target) ? $achievement : null;
    }

    private function recordProgress(User $user, Achievement $achievement, int $progress): bool
    {
        $userAchievement = UserAchievement::query()->firstOrCreate(
            ['user_id' => $user->id, 'achievement_id' => $achievement->id],
            ['progress' => 0],
        );

        if ($userAchievement->unlocked_at !== null) {
            return false;
        }

        $userAchievement->progress = min($progress, $achievement->target);
        $justUnlocked = $progress >= $achievement->target;

        if ($justUnlocked) {
            $userAchievement->unlocked_at = now();
        }

        $userAchievement->save();

        if ($justUnlocked) {
            $this->notifications->notify(
                $user,
                NotificationKind::Achievement,
                'دستاورد جدید باز شد!',
                $achievement->title,
                '/gamification',
            );
        }

        return $justUnlocked;
    }
}
