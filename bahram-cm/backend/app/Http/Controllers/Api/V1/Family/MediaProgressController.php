<?php

namespace App\Http\Controllers\Api\V1\Family;

use App\Http\Controllers\Controller;
use App\Models\FamilyMediaProgress;
use App\Services\Family\FamilyAccessService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MediaProgressController extends Controller
{
    public function __construct(
        private readonly FamilyAccessService $access,
    ) {}

    public function upsert(Request $request): JsonResponse
    {
        $this->access->requireMembership($request->user());

        $data = $request->validate([
            'post_id' => ['required', 'integer', 'exists:family_posts,id'],
            'media_id' => ['required', 'integer', 'exists:family_media,id'],
            'position' => ['required', 'integer', 'min:0'],
            'duration' => ['nullable', 'integer', 'min:1'],
            'event' => ['nullable', 'string', 'in:play,25_percent,50_percent,75_percent,complete,heartbeat'],
        ]);

        $position = (int) $data['position'];
        $duration = isset($data['duration']) ? (int) $data['duration'] : null;
        $event = $data['event'] ?? null;

        $progress = FamilyMediaProgress::query()->firstOrNew([
            'user_id' => $request->user()->id,
            'post_id' => $data['post_id'],
            'media_id' => $data['media_id'],
        ]);

        $progress->last_position = $position;
        $progress->max_position = max((int) ($progress->max_position ?? 0), $position);

        if ($duration && $duration > 0) {
            $percent = (int) min(100, round(($progress->max_position / $duration) * 100));
            $progress->completion_percent = max((int) ($progress->completion_percent ?? 0), $percent);
        }

        if ($event === 'complete' || ($progress->completion_percent ?? 0) >= 95) {
            $progress->completion_percent = 100;
            $progress->completed_at = $progress->completed_at ?? now();
        }

        $progress->save();

        return ApiResponse::success([
            'last_position' => $progress->last_position,
            'max_position' => $progress->max_position,
            'completion_percent' => $progress->completion_percent,
            'completed' => $progress->completed_at !== null,
        ]);
    }
}
