<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Http\Requests\Student\UpdateProfileRequest;
use App\Services\AdminTelegramLogService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->loadMissing('profile');

        return ApiResponse::success($this->payload($user));
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();

        if (array_key_exists('name', $data) && filled($data['name'])) {
            $user->update(['name' => $data['name']]);
        }

        if (array_key_exists('password', $data) && filled($data['password'])) {
            $user->update(['password' => Hash::make($data['password'])]);
        }

        $profileFields = array_intersect_key($data, array_flip([
            'first_name', 'last_name', 'email', 'city', 'age',
            'current_job', 'instagram', 'telegram', 'experience_level', 'income_goal',
        ]));

        if (! empty($profileFields)) {
            $user->profile()->updateOrCreate(['user_id' => $user->id], $profileFields);
        }

        $user->refresh()->loadMissing('profile');

        app(AdminTelegramLogService::class)->notifyProfileUpdated($user);

        return ApiResponse::success($this->payload($user));
    }

    /** @return array<string, mixed> */
    private function payload($user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'mobile' => $user->mobile,
            'has_password' => filled($user->password),
            'profile' => $user->profile ? [
                'first_name' => $user->profile->first_name,
                'last_name' => $user->profile->last_name,
                'email' => $user->profile->email,
                'city' => $user->profile->city,
                'age' => $user->profile->age,
                'current_job' => $user->profile->current_job,
                'instagram' => $user->profile->instagram,
                'telegram' => $user->profile->telegram,
                'experience_level' => $user->profile->experience_level,
                'income_goal' => $user->profile->income_goal,
                'avatar' => $user->profile->avatar,
            ] : null,
        ];
    }
}
