<?php

namespace App\Services\Family;

use App\Models\FamilyPost;
use App\Models\User;

/** Authorizes private `family.{familyId}.post.{postId}.comments` subscriptions. */
class FamilyCommentChannelAuthorizer
{
    public function __construct(
        private readonly FamilyAccessService $access,
        private readonly PostAudienceResolver $audience,
    ) {}

    public function authorize(User $user, int $familyId, int $postId): bool
    {
        $membership = $this->access->homeMembership($user);
        if (! $membership || (int) $membership->family_id !== $familyId) {
            return false;
        }

        $post = FamilyPost::query()->find($postId);
        if (! $post) {
            return false;
        }

        return $this->audience->visibleToFamily($post, $familyId);
    }
}
