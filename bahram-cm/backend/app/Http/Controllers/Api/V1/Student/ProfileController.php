<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Http\Requests\Student\UpdateProfileRequest;
use App\Services\AdminTelegramLogService;
use App\Support\ApiResponse;
use App\Support\MediaUrl;
use App\Support\StudentProfilePayload;
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
            'current_job', 'instagram', 'telegram', 'experience_level', 'income_goal', 'avatar',
        ]));

        if (array_key_exists('avatar', $profileFields) && filled($profileFields['avatar'])) {
            $profileFields['avatar'] = MediaUrl::reference((string) $profileFields['avatar']);
        }

        if (! empty($profileFields)) {
            $user->profile()->updateOrCreate(['user_id' => $user->id], $profileFields);
        }

        $user->refresh()->loadMissing('profile');

        app(AdminTelegramLogService::class)->notifyProfileUpdated($user);

        return ApiResponse::success($this->payload($user));
    }

    public function updateAvatar(Request $request): JsonResponse
    {
        $data = $request->validate([
            'avatar' => ['required', 'image', 'max:2048'],
        ]);

        $user = $request->user();
        $file = $data['avatar'];
        $directory = 'avatars/'.$user->id;
        $filename = 'avatar.'.$file->getClientOriginalExtension();
        $stored = $file->storeAs($directory, $filename, 'public');

        $reference = MediaUrl::fromDiskPath($stored);
        $user->profile()->updateOrCreate(
            ['user_id' => $user->id],
            ['avatar' => $reference],
        );

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
            'profile' => StudentProfilePayload::fromUser($user),
        ];
    }
}
