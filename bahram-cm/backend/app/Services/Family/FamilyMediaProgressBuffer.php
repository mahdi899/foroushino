<?php

namespace App\Services\Family;

use App\Models\FamilyMediaProgress;
use Illuminate\Support\Facades\Cache;

/**
 * Buffers high-frequency media progress heartbeats in cache; persists milestones to DB.
 */
final class FamilyMediaProgressBuffer
{
    private const PREFIX = 'family:media_progress:';

    /** @param  array{post_id: int, media_id: int, position: int, duration?: int|null, event?: string|null}  $data */
    public function record(int $userId, array $data): array
    {
        $postId = (int) $data['post_id'];
        $mediaId = (int) $data['media_id'];
        $position = (int) $data['position'];
        $duration = isset($data['duration']) ? (int) $data['duration'] : null;
        $event = $data['event'] ?? 'heartbeat';

        $key = $this->cacheKey($userId, $postId, $mediaId);
        $existing = Cache::get($key, []);

        $maxPosition = max((int) ($existing['max_position'] ?? 0), $position);
        $completionPercent = (int) ($existing['completion_percent'] ?? 0);

        if ($duration && $duration > 0) {
            $completionPercent = max(
                $completionPercent,
                (int) min(100, round(($maxPosition / $duration) * 100)),
            );
        }

        $completed = (bool) ($existing['completed'] ?? false);
        if ($event === 'complete' || $completionPercent >= 95) {
            $completionPercent = 100;
            $completed = true;
        }

        $state = [
            'post_id' => $postId,
            'media_id' => $mediaId,
            'last_position' => $position,
            'max_position' => $maxPosition,
            'completion_percent' => $completionPercent,
            'completed' => $completed,
            'duration' => $duration ?? ($existing['duration'] ?? null),
        ];

        Cache::put($key, $state, now()->addHours(2));

        if ($this->shouldPersist($event)) {
            $this->persist($userId, $state);
        }

        return [
            'last_position' => $state['last_position'],
            'max_position' => $state['max_position'],
            'completion_percent' => $state['completion_percent'],
            'completed' => $completed,
        ];
    }

    private function shouldPersist(?string $event): bool
    {
        return in_array($event, ['complete', 'play', '25_percent', '50_percent', '75_percent'], true);
    }

    /** @param  array{post_id: int, media_id: int, last_position: int, max_position: int, completion_percent: int, completed: bool}  $state */
    private function persist(int $userId, array $state): void
    {
        $progress = FamilyMediaProgress::query()->firstOrNew([
            'user_id' => $userId,
            'post_id' => $state['post_id'],
            'media_id' => $state['media_id'],
        ]);

        $progress->last_position = $state['last_position'];
        $progress->max_position = max((int) ($progress->max_position ?? 0), $state['max_position']);
        $progress->completion_percent = max(
            (int) ($progress->completion_percent ?? 0),
            $state['completion_percent'],
        );

        if ($state['completed']) {
            $progress->completion_percent = 100;
            $progress->completed_at = $progress->completed_at ?? now();
        }

        $progress->save();
    }

    private function cacheKey(int $userId, int $postId, int $mediaId): string
    {
        return self::PREFIX."{$userId}:{$postId}:{$mediaId}";
    }
}
