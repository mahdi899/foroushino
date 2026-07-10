<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\MiniCourseComment
 */
class MiniCourseCommentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'author_name' => $this->author_name,
            'body' => $this->body,
            'created_at' => $this->created_at?->toIso8601String(),
            'replies' => $this->whenLoaded(
                'replies',
                fn () => MiniCourseCommentResource::collection($this->replies),
            ),
        ];
    }
}
