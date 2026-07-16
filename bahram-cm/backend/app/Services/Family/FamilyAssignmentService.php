<?php

namespace App\Services\Family;

use App\Enums\Family\FamilyLifecycle;
use App\Models\Family;
use App\Models\FamilyMembership;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class FamilyAssignmentService
{
    public function __construct(
        private readonly FamilyCreationService $creation,
        private readonly FamilyMemberCountService $memberCounts,
        private readonly FamilyAssignmentStatsLoader $statsLoader,
        private readonly FamilyAssignmentScorer $scorer,
    ) {}

    /**
     * Resolve existing Home Family or assign a new one. Idempotent.
     */
    public function assign(User $user, ?EntryContext $context = null): FamilyMembership
    {
        $existing = FamilyMembership::query()
            ->where('user_id', $user->id)
            ->first();

        if ($existing) {
            return $existing;
        }

        $context ??= EntryContext::fromArray([]);
        $lockSeconds = (int) config('family.assignment_lock_seconds', 10);

        $globalLock = Cache::lock('family:assignment:global', $lockSeconds);

        return $globalLock->block($lockSeconds, function () use ($user, $context, $lockSeconds) {
            $existing = FamilyMembership::query()
                ->where('user_id', $user->id)
                ->first();

            if ($existing) {
                return $existing;
            }

            $candidates = $this->candidateFamilies();

            if ($candidates->isEmpty()) {
                $family = $this->creation->create($context);

                return $this->joinFamily($user, $family, $context, 1.0);
            }

            $stats = $this->statsLoader->load($candidates);

            $scored = $candidates
                ->map(fn (Family $family) => [
                    'family' => $family,
                    'score' => $this->scorer->score($family, $context, $stats),
                ])
                ->sortByDesc('score')
                ->values();

            foreach ($scored as $row) {
                /** @var Family $family */
                $family = $row['family'];
                $score = (float) $row['score'];

                $familyLock = Cache::lock("family:assignment:family:{$family->id}", $lockSeconds);

                $joined = $familyLock->block($lockSeconds, function () use ($user, $family, $context, $score) {
                    $family->refresh();

                    if (! $family->hasCapacity() || ! $family->accepting_members) {
                        return null;
                    }

                    $existing = FamilyMembership::query()
                        ->where('user_id', $user->id)
                        ->first();

                    if ($existing) {
                        return $existing;
                    }

                    return $this->joinFamily($user, $family, $context, $score);
                });

                if ($joined instanceof FamilyMembership) {
                    return $joined;
                }
            }

            $family = $this->creation->create($context);

            return $this->joinFamily($user, $family, $context, 1.0);
        });
    }

    /**
     * @return \Illuminate\Support\Collection<int, Family>
     */
    private function candidateFamilies()
    {
        return Family::query()
            ->whereIn('lifecycle', [
                FamilyLifecycle::Forming->value,
                FamilyLifecycle::Active->value,
            ])
            ->where('accepting_members', true)
            ->whereColumn('member_count', '<', 'capacity_max')
            ->orderBy('member_count')
            ->limit(50)
            ->get();
    }

    private function joinFamily(User $user, Family $family, EntryContext $context, float $score): FamilyMembership
    {
        return DB::transaction(function () use ($user, $family, $context, $score) {
            $membership = FamilyMembership::query()->create([
                'user_id' => $user->id,
                'family_id' => $family->id,
                'entry_source' => $context->source?->value,
                'entry_campaign' => $context->campaign,
                'entry_content' => $context->content,
                'entry_referrer' => $context->referrer,
                'entry_event_id' => $context->entryEventId,
                'assignment_score' => round($score, 4),
                'joined_at' => now(),
            ]);

            Family::query()
                ->whereKey($family->id)
                ->lockForUpdate()
                ->increment('member_count');

            $this->memberCounts->bump();

            $family->refresh();

            if ($family->member_count > $family->capacity_max) {
                throw new RuntimeException('Family capacity exceeded during join.');
            }

            if ($family->lifecycle === FamilyLifecycle::Forming
                && $family->member_count >= (int) ($family->capacity_min * 0.5)) {
                $family->update(['lifecycle' => FamilyLifecycle::Active]);
            }

            return $membership->fresh(['family']);
        });
    }
}
