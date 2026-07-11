<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\RolePermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

        $admins = User::query()
            ->where('is_admin', true)
            ->with('roles')
            ->orderBy('id')
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'roles' => $u->getRoleNames()->values()->all(),
                'is_super_admin' => $u->isSuperAdmin(),
            ]);

        return response()->json(['data' => $admins]);
    }

    public function assignAdminRole(Request $request, User $admin): JsonResponse
    {
        $data = $request->validate([
            'role' => ['required', 'string'],
            'confirm' => ['required', 'accepted'],
        ]);

        abort_if(! $admin->is_admin, 404);

        $updated = $this->roles->assignRoleToAdmin($request->user(), $admin, $data['role']);

        return response()->json(['data' => [
            'id' => $updated->id,
            'name' => $updated->name,
            'email' => $updated->email,
            'roles' => $updated->getRoleNames()->values()->all(),
            'is_super_admin' => $updated->isSuperAdmin(),
        ]]);
    }
}
