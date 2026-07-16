<?php

namespace App\Http\Resources\V1\Family;

use App\Services\Family\FamilyStatsService;
use App\Support\FamilyMediaUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\FamilyPost */
class FamilyPostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $stat = $this->relationLoaded('stats')
            ? $this->stats->first()
            : null;

        $familyId = (int) ($stat?->family_id ?? 0);
        $stats = $familyId > 0
            ? app(FamilyStatsService::class)->feedStats($stat, (int) $this->id, $familyId)
            : [
                'fire' => 0,
                'heart' => 0,
                'target' => 0,
                'clap' => 0,
                'thumbs_up' => 0,
                'laugh' => 0,
                'sad' => 0,
                'party' => 0,
                'star' => 0,
                'rocket' => 0,
                'eyes' => 0,
                'pray' => 0,
                'muscle' => 0,
                'hundred' => 0,
                'wink' => 0,
                'comments' => (int) ($stat?->approved_comments_count ?? 0),
                'action_responses' => (int) ($stat?->action_responses_count ?? 0),
                'views' => (int) ($stat?->views_count ?? 0),
            ];

        return [
            'id' => $this->id,
            'type' => $this->type?->value ?? $this->type,
            'is_important' => (bool) $this->is_important,
            'comments_enabled' => (bool) ($this->comments_enabled ?? true),
            'is_pinned' => (bool) $this->is_pinned,
            'published_at' => $this->published_at?->toIso8601String(),
            'author' => [
                'name' => $this->resource->getAttribute('author_display_name')
                    ?? $this->author?->name
                    ?? 'بهرام',
                'avatar' => $this->resource->getAttribute('author_avatar'),
            ],
            'blocks' => FamilyPostBlockResource::collection(
                $this->relationLoaded('blocks') ? $this->blocks : collect(),
            ),
            'actions' => FamilyActionResource::collection(
                $this->relationLoaded('actions') ? $this->actions : collect(),
            ),
            'reply_context' => $this->when(
                $this->relationLoaded('replyToComment') && $this->replyToComment,
                fn () => [
                    'comment_body' => $this->replyToComment->body,
                    'user_name' => $this->replyToComment->user?->name,
                ]
            ),
            'stats' => $stats,
            'user_reaction' => $this->resource->getAttribute('user_reaction'),
            'comment_preview' => $this->when(
                $this->resource->getAttribute('comment_preview') !== null,
                fn () => FamilyCommentResource::collection(
                    collect($this->resource->getAttribute('comment_preview'))
                )->resolve(),
            ),
        ];
    }
}
