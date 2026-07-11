<?php

namespace App\Support;

use App\Models\User;
use App\Models\UserProfile;

final class StudentProfilePayload
{
    /** @return array<string, mixed> */
    public static function fromUser(User $user): array
    {
        $user->loadMissing('profile');

        $data = self::fromProfile($user->profile) ?? [
            'first_name' => null,
            'last_name' => null,
            'email' => null,
            'city' => null,
            'age' => null,
            'current_job' => null,
            'instagram' => null,
            'telegram' => null,
            'experience_level' => null,
            'income_goal' => null,
            'avatar' => null,
            'avatar_url' => null,
        ];

        $data['gravatar_url'] = null;
        $data['default_avatar_url'] = self::defaultAvatarUrl($user);

        return $data;
    }

    /** @return array<string, mixed>|null */
    public static function fromProfile(?UserProfile $profile): ?array
    {
        if (! $profile) {
            return null;
        }

        return [
            'first_name' => $profile->first_name,
            'last_name' => $profile->last_name,
            'email' => $profile->email,
            'city' => $profile->city,
            'age' => $profile->age,
            'current_job' => $profile->current_job,
            'instagram' => $profile->instagram,
            'telegram' => $profile->telegram,
            'experience_level' => $profile->experience_level,
            'income_goal' => $profile->income_goal,
            'avatar' => $profile->avatar,
            'avatar_url' => $profile->avatar ? MediaUrl::resolve($profile->avatar) : null,
        ];
    }

    private static function defaultAvatarUrl(User $user): string
    {
        $seed = rawurlencode((string) $user->id);

        return "https://api.dicebear.com/9.x/lorelei/png?seed={$seed}&size=80";
    }
}
