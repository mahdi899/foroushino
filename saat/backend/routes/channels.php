<?php

use App\Enums\RoleName;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('team.{teamId}', function ($user, $teamId) {
    return (int) $user->team_id === (int) $teamId
        || $user->hasAnyRole([RoleName::Manager->value, RoleName::Admin->value]);
});

Broadcast::channel('managers', function ($user) {
    return $user->hasAnyRole([RoleName::Manager->value, RoleName::Admin->value, RoleName::Supervisor->value]);
});

Broadcast::presence('presence-team.{teamId}', function ($user, $teamId) {
    if ((int) $user->team_id === (int) $teamId || $user->hasAnyRole([RoleName::Manager->value, RoleName::Admin->value])) {
        return ['id' => $user->id, 'name' => $user->name];
    }

    return null;
});
