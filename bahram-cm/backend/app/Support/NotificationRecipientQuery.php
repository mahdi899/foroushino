<?php

namespace App\Support;

use App\Models\NotificationRecipient;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

final class NotificationRecipientQuery
{
    /** @return Builder<NotificationRecipient> */
    public static function forUser(User $user, string $scope): Builder
    {
        $query = NotificationRecipient::query()
            ->where('user_id', $user->id)
            ->with('notification')
            ->orderByDesc('id');

        if ($scope === 'family') {
            $query->whereHas('notification', fn ($q) => $q->where('type', 'like', 'family_%'));
        } else {
            $query->whereHas('notification', fn ($q) => $q->where('type', 'not like', 'family_%'));
        }

        return $query;
    }
}
