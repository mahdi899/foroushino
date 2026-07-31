<?php

namespace App\Http\Resources\V1\Family;

use App\Support\FamilyDateTime;
use App\Support\MediaUrl;
use App\Support\StudentDisplayName;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\FamilyComment */
class FamilyCommentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $isOwner = $user && (int) $user->id === (int) $this->user_id;

        $profile = $this->user?->profile;
        $avatarRef = $profile?->avatar;

        return [
            'id' => $this->id,
            'body' => $this->body,
            'status' => $this->status?->value ?? $this->status,
            'created_at' => FamilyDateTime::toApi($this->created_at),
            'user' => [
                'name' => $this->user
                    ? StudentDisplayName::fromUser($this->user)
                    : 'عضو خانواده',
                'avatar' => $avatarRef ? MediaUrl::resolve($avatarRef) : null,
                'avatar_version' => $avatarRef ? $profile?->updated_at?->getTimestamp() : null,
            ],
            'rejection_reason' => $this->when(
                $isOwner && ($this->status?->value ?? $this->status) === 'rejected',
                fn () => $this->rejection_reason?->label() ?? $this->rejection_note
            ),
            'is_pending_mine' => $isOwner && ($this->status?->value ?? $this->status) === 'pending',
        ];
    }
}
