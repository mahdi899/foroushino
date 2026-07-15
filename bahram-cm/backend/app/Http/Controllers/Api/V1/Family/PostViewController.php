<?php

namespace App\Http\Controllers\Api\V1\Family;

use App\Http\Controllers\Controller;
use App\Models\FamilyPost;
use App\Services\Family\FamilyAccessService;
use App\Services\Family\FamilyStatsService;
use App\Services\Family\PostAudienceResolver;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PostViewController extends Controller
{
    public function __construct(
        private readonly FamilyAccessService $access,
        private readonly FamilyStatsService $stats,
        private readonly PostAudienceResolver $audience,
    ) {}

    public function store(Request $request, FamilyPost $post): JsonResponse
    {
        $membership = $this->access->requireMembership($request->user());
        abort_unless($this->audience->visibleToFamily($post, (int) $membership->family_id), 404);

        $views = $this->stats->recordView(
            (int) $post->id,
            (int) $membership->family_id,
            (int) $request->user()->id,
        );

        return ApiResponse::success(['views' => $views]);
    }
}
