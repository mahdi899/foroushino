<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Headless admin auth: Sanctum bearer tokens only.
     * Legacy web-session bridge (auth/web-session + Filament embed) was removed with Filament.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::query()->where('email', $request->string('email'))->first();

        if (! $user || ! Hash::check($request->string('password'), $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['اطلاعات ورود نادرست است.'],
            ]);
        }

        if (! $user->is_admin) {
            throw ValidationException::withMessages([
                'email' => ['شما دسترسی مدیریت ندارید.'],
            ]);
        }

        $token = $user->createToken('bahram-admin')->plainTextToken;

        return response()->json([
            'token' => $token,
            'data' => $this->userPayload($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()?->currentAccessToken();
        if ($token && method_exists($token, 'delete')) {
            $token->delete();
        }

        return response()->json(null, 204);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        return response()->json(['data' => $this->userPayload($user)]);
    }

    /** @return array<string, mixed> */
    private function userPayload(User $user): array
    {
        $roles = $user->getRoleNames()->values()->all();
        $permissions = $user->isSuperAdmin()
            ? $user->getAllPermissions()->pluck('name')->values()->all()
            : $user->getAllPermissions()->pluck('name')->values()->all();

        if ($user->isSuperAdmin() && $permissions === []) {
            $permissions = \App\Support\PermissionCatalog::all();
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'roles' => $roles,
            'permissions' => $permissions,
            'is_super_admin' => $user->isSuperAdmin(),
        ];
    }
}
