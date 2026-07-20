<?php

namespace App\Http\Controllers\Api\V1\FamilyManager;

use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Family\FamilyManagerAdminService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminsController extends Controller
{
    public function __construct(private readonly FamilyManagerAdminService $admins) {}

    public function index(Request $request): JsonResponse
    {
        $this->admins->assertCanManage($request->user());

        $rows = array_map(
            fn (User $user) => $this->payload($user, $request->user()),
            $this->admins->list(),
        );

        return ApiResponse::success($rows);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255'],
            'mobile' => ['required', 'string', 'max:20'],
            'password' => ['required', 'string', 'min:8', 'max:128'],
        ]);

        $admin = $this->admins->create(
            $request->user(),
            $data['name'],
            $data['email'],
            $data['mobile'],
            $data['password'],
        );

        return ApiResponse::success($this->payload($admin, $request->user()), 201);
    }

    public function update(Request $request, User $admin): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'email' => ['sometimes', 'email', 'max:255'],
            'mobile' => ['sometimes', 'string', 'max:20'],
        ]);

        $updated = $this->admins->updateProfile($request->user(), $admin, $data);

        return ApiResponse::success($this->payload($updated, $request->user()));
    }

    public function resetPassword(Request $request, User $admin): JsonResponse
    {
        $data = $request->validate([
            'password' => ['required', 'string', 'min:8', 'max:128'],
        ]);

        $this->admins->resetPassword($request->user(), $admin, $data['password']);

        return ApiResponse::success(['message' => 'رمز عبور به‌روز شد.']);
    }

    public function updateStatus(Request $request, User $admin): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string', Rule::in(UserStatus::values())],
        ]);

        $updated = $this->admins->setStatus(
            $request->user(),
            $admin,
            UserStatus::from($data['status']),
        );

        return ApiResponse::success($this->payload($updated, $request->user()));
    }

    public function destroy(Request $request, User $admin): JsonResponse
    {
        $this->admins->delete($request->user(), $admin);

        return response()->json(null, 204);
    }

    /** @return array<string, mixed> */
    private function payload(User $user, User $viewer): array
    {
        $status = $user->status?->value ?? UserStatus::Active->value;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'mobile' => $user->mobile,
            'status' => $status,
            'is_active' => $status === UserStatus::Active->value,
            'is_suspended' => $status === UserStatus::Suspended->value,
            'is_root_admin' => $user->isRootAdmin(),
            'is_super_admin' => $user->isSuperAdmin(),
            'roles' => $user->getRoleNames()->values()->all(),
            'can_edit' => ! $user->isRootAdmin() && $user->id !== $viewer->id,
            'can_suspend' => ! $user->isRootAdmin() && $user->id !== $viewer->id,
            'can_reset_password' => ! $user->isRootAdmin(),
            'can_delete' => ! $user->isRootAdmin() && $user->id !== $viewer->id,
        ];
    }
}
