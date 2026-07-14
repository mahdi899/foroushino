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
            // Re-check after acquiring lock (idempotent under concurrency).
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

            $scored = $candidates
                ->map(fn (Family $family) => [
                    'family' => $family,
                    'score' => $this->scoreFamily($family, $context),
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

                    if (! $family->hasCapacity()) {
                        return null;
                    }

                    // Another concurrent assign may have created membership.
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

            // All candidates full — create a new family.
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
            ->whereColumn('member_count', '<', 'capacity_max')
            ->orderBy('member_count')
            ->limit(50)
            ->get();
    }

    private function scoreFamily(Family $family, EntryContext $context): float
    {
        $weights = config('family.assignment_weights', []);
        $wSource = (float) ($weights['source_match'] ?? 0.35);
        $wEvent = (float) ($weights['entry_event'] ?? 0.30);
        $wCapacity = (float) ($weights['capacity_balance'] ?? 0.20);
        $wDiversity = (float) ($weights['family_diversity'] ?? 0.15);

        $sourceScore = 0.0;
        if ($context->source && $family->primary_source === $context->source->value) {
            $sourceScore = 1.0;
        } elseif ($family->primary_source === null) {
            $sourceScore = 0.5;
        }

        $eventScore = 0.0;
        if ($context->entryEventId && $family->entry_event_id === $context->entryEventId) {
            $eventScore = 1.0;
        } elseif ($family->entry_event_id === null) {
            $eventScore = 0.4;
        }

        // Prefer families farther from max capacity (more room).
        $capacityScore = 1.0 - $family->capacityRatio();

        // Prefer smaller families for diversity / balance.
        $diversityScore = 1.0 - min(1.0, $family->member_count / max(1, $family->capacity_target));

        return ($sourceScore * $wSource)
            + ($eventScore * $wEvent)
            + ($capacityScore * $wCapacity)
            + ($diversityScore * $wDiversity);
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
