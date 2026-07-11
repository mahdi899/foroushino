<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\RolePermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class RoleAdminController extends Controller
{
    public function __construct(private readonly RolePermissionService $roles) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermission('roles.view') || $request->user()->isSuperAdmin(), 403);

        return response()->json([
            'data' => $this->roles->listRoles(),
            'permission_groups' => $this->roles->permissionsGrouped(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'label' => ['nullable', 'string', 'max:120'],
            'permissions' => ['array'],
            'permissions.*' => ['string'],
        ]);

        $role = $this->roles->createRole(
            $request->user(),
            $data['name'],
            $data['label'] ?? $data['name'],
            $data['permissions'] ?? [],
        );

        return response()->json(['data' => $role], 201);
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        $data = $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*' => ['string'],
        ]);

        $payload = $this->roles->updateRolePermissions($request->user(), $role, $data['permissions']);

        return response()->json(['data' => $payload]);
    }

    public function admins(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermission('roles.view') || $request->user()->isSuperAdmin(), 403);

        return response()->json(['data' => $this->adminRows()]);
    }

    public function storeAdmin(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'max:128'],
            'role' => ['required', 'string', Rule::exists('roles', 'name')->where('guard_name', 'web')],
        ]);

        $admin = $this->roles->createAdmin(
            $request->user(),
            $data['name'],
            $data['email'],
            $data['password'],
            $data['role'],
        );

        return response()->json(['data' => $this->adminPayload($admin)], 201);
    }

    public function assignAdminRole(Request $request, User $admin): JsonResponse
    {
        $data = $request->validate([
            'role' => ['required', 'string'],
            'confirm' => ['required', 'accepted'],
        ]);

        abort_if(! $admin->is_admin, 404);

        $updated = $this->roles->assignRoleToAdmin($request->user(), $admin, $data['role']);

        return response()->json(['data' => $this->adminPayload($updated)]);
    }

    /** @return list<array<string, mixed>> */
    private function adminRows(): array
    {
        return User::query()
            ->where('is_admin', true)
            ->with('roles')
            ->orderBy('id')
            ->get()
            ->map(fn (User $u) => $this->adminPayload($u))
            ->values()
            ->all();
    }

    /** @return array<string, mixed> */
    private function adminPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'roles' => $user->getRoleNames()->values()->all(),
            'is_super_admin' => $user->isSuperAdmin(),
        ];
    }
}
