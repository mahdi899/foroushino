<?php

namespace App\Http\Resources\V1\Family;

use App\Models\FamilyComment;
use App\Services\Family\FamilyBrandingService;
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

        return $this->serializeForViewer($isOwner);
    }

    /**
     * Viewer-agnostic payload for Reverb — never includes pending/rejected owner-only fields.
     *
     * @return array<string, mixed>
     */
    public static function toRealtimeArray(FamilyComment $comment): array
    {
        return (new self($comment))->serializeForViewer(false, false);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeForViewer(bool $isOwner, bool $includeReplies = true): array
    {
        $isBahramReply = $this->parent_id !== null && (bool) ($this->user?->is_admin);

        $profile = $this->user?->profile;
        $branding = $isBahramReply ? app(FamilyBrandingService::class)->publicPayload() : null;
        $avatarRef = $isBahramReply
            ? ($branding['profile_avatar'] ?? null)
            : $profile?->avatar;

        $payload = [
            'id' => $this->id,
            'body' => $this->body,
            'status' => $this->status?->value ?? $this->status,
            'created_at' => FamilyDateTime::toApi($this->created_at),
            'is_important' => (bool) $this->is_important,
            'parent_id' => $this->parent_id,
            'is_bahram_reply' => $isBahramReply,
            'user' => [
                'name' => $isBahramReply
                    ? ($branding['profile_name'] ?? 'بهرام')
                    : ($this->user
                        ? StudentDisplayName::fromUser($this->user)
                        : 'عضو خانواده'),
                'avatar' => $avatarRef ? MediaUrl::resolve($avatarRef) : null,
                'avatar_version' => $avatarRef && ! $isBahramReply ? $profile?->updated_at?->getTimestamp() : null,
            ],
            'is_pending_mine' => $isOwner && ($this->status?->value ?? $this->status) === 'pending',
            'is_mine' => $isOwner,
        ];

        if ($includeReplies) {
            $payload['replies'] = FamilyCommentResource::collection(
                $this->whenLoaded('replies'),
            );
        } else {
            $payload['replies'] = [];
        }

        if ($isOwner && ($this->status?->value ?? $this->status) === 'rejected') {
            $payload['rejection_reason'] = $this->rejection_reason?->label() ?? $this->rejection_note;
        }

        return $payload;
    }
}
