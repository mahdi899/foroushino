<?php

namespace App\Services;

use App\Enums\ActivityKind;
use App\Models\ActivityLog;
use App\Models\User;

class ActivityLogService
{
    public function log(User $user, ActivityKind $kind, string $title, ?string $meta = null): ActivityLog
    {
        return ActivityLog::query()->create([
            'user_id' => $user->id,
            'kind' => $kind,
            'title' => $title,
            'meta' => $meta,
        ]);
    }
}
