<?php

namespace App\Http\Resources\V1\Family;

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

        return [
            'id' => $this->id,
            'type' => $this->type?->value ?? $this->type,
            'is_important' => (bool) $this->is_important,
            'published_at' => $this->published_at?->toIso8601String(),
            'author' => [
                'name' => $this->author?->name ?? 'بهرام',
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
            'stats' => [
                'fire' => (int) ($stat?->fire_count ?? 0),
                'heart' => (int) ($stat?->heart_count ?? 0),
                'target' => (int) ($stat?->target_count ?? 0),
                'clap' => (int) ($stat?->clap_count ?? 0),
                'comments' => (int) ($stat?->approved_comments_count ?? 0),
                'action_responses' => (int) ($stat?->action_responses_count ?? 0),
            ],
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
