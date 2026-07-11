<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\RolePermissionService;
use App\Support\EmailMask;
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
        abort_unless($request->user()->isSuperAdmin(), 403);

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
        abort_unless($request->user()->isSuperAdmin(), 403);

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

        return response()->json([
            'data' => $this->adminRows($request->user()),
        ]);
    }

    public function storeAdmin(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()->isSuperAdmin() || $request->user()->hasPermission('admins.create'),
            403,
        );

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255'],
            'mobile' => ['required', 'string', 'max:20'],
            'password' => ['required', 'string', 'min:8', 'max:128'],
            'role' => ['required', 'string', Rule::exists('roles', 'name')->where('guard_name', 'web')],
        ]);

        $admin = $this->roles->createAdmin(
            $request->user(),
            $data['name'],
            $data['email'],
            $data['password'],
            $data['role'],
            $data['mobile'],
        );

        return response()->json(['data' => $this->adminPayload($admin, $request->user())], 201);
    }

    public function assignAdminRole(Request $request, User $admin): JsonResponse
    {
        abort_unless(
            $request->user()->isSuperAdmin() || $request->user()->hasPermission('admins.assign_role'),
            403,
        );

        $data = $request->validate([
            'role' => ['required', 'string'],
            'confirm' => ['required', 'accepted'],
        ]);

        abort_if(! $admin->is_admin, 404);

        $updated = $this->roles->assignRoleToAdmin($request->user(), $admin, $data['role']);

        return response()->json(['data' => $this->adminPayload($updated, $request->user())]);
    }

    public function destroyAdmin(Request $request, User $admin): JsonResponse
    {
        abort_unless(
            $request->user()->isSuperAdmin() || $request->user()->hasPermission('admins.delete'),
            403,
        );
        abort_if(! $admin->is_admin, 404);

        $this->roles->deleteAdmin($request->user(), $admin);

        return response()->json(null, 204);
    }

    /** @return list<array<string, mixed>> */
    private function adminRows(User $viewer): array
    {
        return User::query()
            ->where('is_admin', true)
            ->with('roles')
            ->orderBy('id')
            ->get()
            ->map(fn (User $u) => $this->adminPayload($u, $viewer))
            ->values()
            ->all();
    }

    /** @return array<string, mixed> */
    private function adminPayload(User $user, ?User $viewer = null): array
    {
        $canViewEmail = $viewer && ($viewer->isSuperAdmin() || $viewer->hasPermission('admins.view_email'));

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $canViewEmail ? $user->email : EmailMask::mask($user->email),
            'mobile' => $user->mobile,
            'roles' => $user->getRoleNames()->values()->all(),
            'is_super_admin' => $user->isSuperAdmin(),
            'can_view_email' => $canViewEmail,
            'can_create' => $viewer && ($viewer->isSuperAdmin() || $viewer->hasPermission('admins.create')),
            'can_assign_role' => $viewer && ($viewer->isSuperAdmin() || $viewer->hasPermission('admins.assign_role')),
            'can_delete' => $viewer && ($viewer->isSuperAdmin() || $viewer->hasPermission('admins.delete')),
        ];
    }
}
