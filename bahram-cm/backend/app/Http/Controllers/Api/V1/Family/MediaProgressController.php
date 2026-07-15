<?php

namespace App\Http\Controllers\Api\V1\Family;

use App\Http\Controllers\Controller;
use App\Services\Family\FamilyAccessService;
use App\Services\Family\FamilyMediaProgressBuffer;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MediaProgressController extends Controller
{
    public function __construct(
        private readonly FamilyAccessService $access,
        private readonly FamilyMediaProgressBuffer $buffer,
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

        $result = $this->buffer->record($request->user()->id, $data);

        return ApiResponse::success([
            'last_position' => $result['last_position'],
            'max_position' => $result['max_position'],
            'completion_percent' => $result['completion_percent'],
            'completed' => $result['completed'],
        ]);
    }
}
