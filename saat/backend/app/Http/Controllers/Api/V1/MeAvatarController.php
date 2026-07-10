<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Me\UploadAvatarRequest;
use App\Http\Resources\V1\UserResource;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MeAvatarController extends Controller
{
    public function store(UploadAvatarRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $file = $request->file('avatar');
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension() ?: 'jpg');

        if (! in_array($extension, ['jpg', 'jpeg', 'png', 'webp'], true)) {
            return ApiResponse::validationError([
                'avatar' => ['فرمت مجاز: JPG، PNG یا WebP.'],
            ]);
        }

        $this->deleteStoredAvatar($user->avatar);

        $path = $file->storeAs(
            'avatars/users',
            $user->id.'.'.$extension,
            'public',
        );

        $user->update([
            'avatar' => Storage::disk('public')->url($path),
        ]);

        return ApiResponse::success(
            data: new UserResource($user->fresh()->load('team')),
            message: 'عکس پروفایل به‌روزرسانی شد',
        );
    }

    public function destroy(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->deleteStoredAvatar($user->avatar);
        $user->update(['avatar' => null]);

        return ApiResponse::success(
            data: new UserResource($user->fresh()->load('team')),
            message: 'عکس پروفایل حذف شد',
        );
    }

    private function deleteStoredAvatar(?string $avatar): void
    {
        if ($avatar === null || $avatar === '') {
            return;
        }

        $path = $this->storedAvatarPath($avatar);
        if ($path !== null && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }

    private function storedAvatarPath(string $avatar): ?string
    {
        $storageUrl = rtrim(Storage::disk('public')->url(''), '/');

        if (Str::startsWith($avatar, $storageUrl.'/avatars/users/')) {
            return Str::after($avatar, $storageUrl.'/');
        }

        if (Str::startsWith($avatar, '/storage/avatars/users/')) {
            return Str::after($avatar, '/storage/');
        }

        return null;
    }
}
