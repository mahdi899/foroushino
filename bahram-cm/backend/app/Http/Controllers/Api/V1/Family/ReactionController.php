<?php

namespace App\Http\Controllers\Api\V1\Family;

use App\Enums\Family\FamilyReactionType;
use App\Http\Controllers\Controller;
use App\Models\FamilyPost;
use App\Models\FamilyReaction;
use App\Services\Family\FamilyAccessService;
use App\Services\Family\FamilyStatsService;
use App\Services\Family\PostAudienceResolver;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ReactionController extends Controller
{
    public function __construct(
        private readonly FamilyAccessService $access,
        private readonly FamilyStatsService $stats,
        private readonly PostAudienceResolver $audience,
    ) {}

    public function upsert(Request $request, FamilyPost $post): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::enum(FamilyReactionType::class)],
        ]);

        $membership = $this->access->requireMembership($request->user());
        abort_unless($this->audience->visibleToFamily($post, (int) $membership->family_id), 404);

        $type = FamilyReactionType::from($data['type']);

        $result = DB::transaction(function () use ($post, $membership, $request, $type) {
            $existing = FamilyReaction::query()
                ->where('post_id', $post->id)
                ->where('user_id', $request->user()->id)
                ->lockForUpdate()
                ->first();

            $oldType = $existing?->type;

            if ($existing) {
                $existing->update([
                    'type' => $type,
                    'family_id' => $membership->family_id,
                ]);
            } else {
                FamilyReaction::query()->create([
                    'post_id' => $post->id,
                    'user_id' => $request->user()->id,
                    'family_id' => $membership->family_id,
                    'type' => $type,
                ]);
            }

            $this->stats->setReaction(
                (int) $post->id,
                (int) $membership->family_id,
                $oldType instanceof FamilyReactionType ? $oldType : ($oldType ? FamilyReactionType::tryFrom((string) $oldType) : null),
                $type,
            );

            return $type->value;
        });

        return ApiResponse::success(['type' => $result]);
    }

    public function destroy(Request $request, FamilyPost $post): JsonResponse
    {
        $membership = $this->access->requireMembership($request->user());

        DB::transaction(function () use ($post, $membership, $request) {
            $existing = FamilyReaction::query()
                ->where('post_id', $post->id)
                ->where('user_id', $request->user()->id)
                ->lockForUpdate()
                ->first();

            if (! $existing) {
                return;
            }

            $type = $existing->type instanceof FamilyReactionType
                ? $existing->type
                : FamilyReactionType::from((string) $existing->type);

            $existing->delete();
            $this->stats->removeReaction((int) $post->id, (int) $membership->family_id, $type);
        });

        return ApiResponse::success(['removed' => true]);
    }
}
