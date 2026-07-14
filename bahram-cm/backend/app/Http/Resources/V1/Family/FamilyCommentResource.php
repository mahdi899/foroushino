<?php

namespace App\Http\Resources\V1\Family;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\FamilyComment */
class FamilyCommentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $isOwner = $user && (int) $user->id === (int) $this->user_id;

        return [
            'id' => $this->id,
            'body' => $this->body,
            'status' => $this->status?->value ?? $this->status,
            'created_at' => $this->created_at?->toIso8601String(),
            'user' => [
                'name' => $this->user?->name ?? 'عضو خانواده',
                'avatar' => $this->user?->profile?->avatar_url ?? null,
            ],
            'rejection_reason' => $this->when(
                $isOwner && ($this->status?->value ?? $this->status) === 'rejected',
                fn () => $this->rejection_reason?->label() ?? $this->rejection_note
            ),
            'is_pending_mine' => $isOwner && ($this->status?->value ?? $this->status) === 'pending',
        ];
    }
}
