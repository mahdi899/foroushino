<?php

namespace App\Services\Shift;

use App\Enums\Availability;
use App\Models\User;
use App\Models\UserWorkSession;

class ShiftTimeTracker
{
    public function isProductive(?Availability $availability): bool
    {
        if ($availability === null) {
            return false;
        }

        return in_array($availability, [
            Availability::Available,
            Availability::InCall,
            Availability::DoingFollowUp,
        ], true);
    }

    public function openSession(User $user): ?UserWorkSession
    {
        return UserWorkSession::query()
            ->where('user_id', $user->id)
            ->whereNull('ended_at')
            ->latest('started_at')
            ->first();
    }

    /**
     * Accumulate elapsed time for the user's current availability onto the open session.
     */
    public function flushSegment(User $user): void
    {
        $session = $this->openSession($user);
        if (! $session) {
            return;
        }

        $previous = $user->availability;
        $changedAt = $user->availability_changed_at;
        if (! $previous || ! $changedAt) {
            return;
        }

        $elapsed = max(0, (int) $changedAt->diffInSeconds(now()));
        if ($elapsed === 0) {
            return;
        }

        if ($this->isProductive($previous)) {
            $session->total_productive_seconds = (int) $session->total_productive_seconds + $elapsed;
        } elseif ($previous !== Availability::Offline) {
            $session->total_break_seconds = (int) $session->total_break_seconds + $elapsed;
        }

        $session->save();
    }

    public function changeAvailability(User $user, Availability $next): void
    {
        $this->flushSegment($user);

        $user->availability = $next;
        $user->availability_changed_at = now();
        $user->save();
    }

    public function addCallSeconds(User $user, int $seconds): void
    {
        if ($seconds <= 0) {
            return;
        }

        $session = $this->openSession($user);
        if (! $session) {
            return;
        }

        $session->total_call_seconds = (int) $session->total_call_seconds + $seconds;
        $session->save();
    }

    public function liveProductiveSeconds(User $user, ?UserWorkSession $session): int
    {
        if (! $session) {
            return 0;
        }

        $total = (int) $session->total_productive_seconds;

        if ($this->isProductive($user->availability) && $user->availability_changed_at) {
            $total += max(0, (int) $user->availability_changed_at->diffInSeconds(now()));
        }

        return $total;
    }

    public function liveBreakSeconds(User $user, ?UserWorkSession $session): int
    {
        if (! $session) {
            return 0;
        }

        $total = (int) $session->total_break_seconds;

        $current = $user->availability;
        if ($current && ! $this->isProductive($current) && $current !== Availability::Offline && $user->availability_changed_at) {
            $total += max(0, (int) $user->availability_changed_at->diffInSeconds(now()));
        }

        return $total;
    }
}
