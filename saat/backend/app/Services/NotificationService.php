<?php

namespace App\Services;

use App\Enums\NotificationKind;
use App\Events\NotificationCreated;
use App\Models\AppNotification;
use App\Models\User;
use App\Support\SafeBroadcast;

class NotificationService
{
    public function notify(User $user, NotificationKind $kind, string $title, string $body, ?string $href = null): AppNotification
    {
        $notification = AppNotification::query()->create([
            'user_id' => $user->id,
            'kind' => $kind,
            'title' => $title,
            'body' => $body,
            'href' => $href,
        ]);

        SafeBroadcast::optionally(
            fn () => broadcast(new NotificationCreated($notification))->toOthers(),
        );

        return $notification;
    }
}
