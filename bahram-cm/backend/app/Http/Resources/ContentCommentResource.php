<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\ContentComment
 */
class ContentCommentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'author_name' => $this->author_name,
            'author_avatar_url' => $this->author_avatar_url,
            'body' => $this->body,
            'created_at' => $this->created_at?->toIso8601String(),
            'replies' => $this->whenLoaded(
                'replies',
                fn () => ContentCommentResource::collection($this->replies),
            ),
        ];
    }
}
