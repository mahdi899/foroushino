<?php

use App\Models\User;
use App\Services\Family\FamilyCommentChannelAuthorizer;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('family.{familyId}.post.{postId}.comments', function (User $user, int $familyId, int $postId) {
    return app(FamilyCommentChannelAuthorizer::class)->authorize($user, $familyId, $postId);
});
