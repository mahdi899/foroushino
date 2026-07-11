<?php

namespace App\Services;

use App\Enums\AdminRoleName;
use App\Models\User;
use App\Support\PermissionCatalog;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionService
{
    public function __construct(private readonly AdminAuditLogger $audit) {}

    /** @return list<array<string, mixed>> */
    public function listRoles(): array
    {
        return Role::query()
            ->where('guard_name', 'web')
            ->with('permissions')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => $this->rolePayload($role))
            ->values()
            ->all();
    }

    /** @return array<string, mixed> */
    public function permissionsGrouped(): array
    {
        $groups = [];
        foreach (PermissionCatalog::groups() as $module => $permissions) {
            $groups[] = [
                'module' => $module,
                'permissions' => array_map(fn (string $p) => [
                    'name' => $p,
                    'label' => PermissionCatalog::label($p),
                    'reserved' => in_array($p, PermissionCatalog::reservedForSuperAdmin(), true),
                ], $permissions),
            ];
        }

        return $groups;
    }

    /**
     * @param  list<string>  $permissions
     * @return array<string, mixed>
     */
    public function createRole(User $actor, string $name, string $label, array $permissions): array
    {
        $this->assertCanManageRoles($actor);
        $slug = str($name)->lower()->replace(' ', '-')->toString();

        if (Role::query()->where('name', $slug)->exists()) {
            throw ValidationException::withMessages(['name' => ['این نقش از قبل وجود دارد.']]);
        }

        $permissions = $this->filterAssignablePermissions($actor, $permissions);

        $role = DB::transaction(function () use ($slug, $permissions) {
            $role = Role::create(['name' => $slug, 'guard_name' => 'web']);
            $role->syncPermissions($permissions);

            return $role;
        });

        $this->audit->log($actor, 'role.created', $role, [
            'role' => $slug,
            'permissions' => $permissions,
            'label' => $label,
        ]);

        return $this->rolePayload($role->load('permissions'));
    }

    /**
     * @param  list<string>  $permissions
     * @return array<string, mixed>
     */
    public function updateRolePermissions(User $actor, Role $role, array $permissions): array
    {
        $this->assertCanManageRoles($actor);

        if ($role->name === AdminRoleName::SuperAdmin->value) {
            throw ValidationException::withMessages([
                'role' => ['نمی‌توانید دسترسی‌های نقش مدیر کل را تغییر دهید.'],
            ]);
        }

        if (! $actor->isSuperAdmin()) {
            $requestedReserved = array_values(array_intersect(
                $permissions,
                PermissionCatalog::reservedForSuperAdmin(),
            ));
            if ($requestedReserved !== []) {
                abort(403, 'اجازه دسترسی ندارید.');
            }
        }

        $permissions = $this->filterAssignablePermissions($actor, $permissions);
        $before = $role->permissions->pluck('name')->all();

        $role->syncPermissions($permissions);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->audit->log($actor, 'role.permissions_updated', $role, [
            'role' => $role->name,
            'before' => $before,
            'after' => $permissions,
        ]);

        return $this->rolePayload($role->load('permissions'));
    }

    public function createAdmin(User $actor, string $name, string $email, string $password, string $roleName): User
    {
        $this->assertCanManageRoles($actor);

        if ($roleName === AdminRoleName::SuperAdmin->value && ! $actor->isSuperAdmin()) {
            throw ValidationException::withMessages([
                'role' => ['فقط مدیر کل می‌تواند مدیر کل جدید بسازد.'],
            ]);
        }

        Role::findByName($roleName, 'web');

        if (User::query()->where('email', $email)->exists()) {
            throw ValidationException::withMessages([
                'email' => ['این ایمیل قبلاً ثبت شده است.'],
            ]);
        }

        $admin = DB::transaction(function () use ($name, $email, $password, $roleName) {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => $password,
                'is_admin' => true,
            ]);
            $user->assignRole($roleName);

            return $user;
        });

        $this->audit->log($actor, 'admin.created', $admin, [
            'email' => $email,
            'role' => $roleName,
        ]);

        return $admin->fresh();
    }

    public function assignRoleToAdmin(User $actor, User $admin, string $roleName): User
    {
        $this->assertCanManageRoles($actor);

        if (! $admin->is_admin) {
            throw ValidationException::withMessages(['user' => ['کاربر هدف ادمین نیست.']]);
        }

        if ($admin->id === $actor->id && $roleName !== AdminRoleName::SuperAdmin->value && $admin->isSuperAdmin()) {
            $this->assertNotLastSuperAdmin($admin);
        }

        if ($admin->isSuperAdmin() && $roleName !== AdminRoleName::SuperAdmin->value) {
            $this->assertNotLastSuperAdmin($admin);
        }

        $before = $admin->getRoleNames()->all();

        DB::transaction(function () use ($admin, $roleName) {
            $admin->syncRoles([$roleName]);
        });

        $this->audit->log($actor, 'admin.role_changed', $admin, [
            'before' => $before,
            'after' => [$roleName],
        ]);

        return $admin->fresh();
    }

    private function assertCanManageRoles(User $actor): void
    {
        if (! $actor->isSuperAdmin() && ! $actor->hasPermission('roles.manage')) {
            abort(403, 'اجازه دسترسی ندارید.');
        }
    }

    private function assertNotLastSuperAdmin(User $admin): void
    {
        $count = User::role(AdminRoleName::SuperAdmin->value)->where('is_admin', true)->count();
        if ($count <= 1 && $admin->isSuperAdmin()) {
            throw ValidationException::withMessages([
                'role' => ['نمی‌توانید نقش آخرین مدیر کل را تغییر دهید.'],
            ]);
        }
    }

    /**
     * @param  list<string>  $permissions
     * @return list<string>
     */
    private function filterAssignablePermissions(User $actor, array $permissions): array
    {
        $allowed = array_values(array_intersect($permissions, PermissionCatalog::all()));

        if (! $actor->isSuperAdmin()) {
            $allowed = array_values(array_diff($allowed, PermissionCatalog::reservedForSuperAdmin()));
        }

        return $allowed;
    }

    /** @return array<string, mixed> */
    private function rolePayload(Role $role): array
    {
        $enum = AdminRoleName::tryFrom($role->name);

        return [
            'id' => $role->id,
            'name' => $role->name,
            'label' => $enum?->label() ?? $role->name,
            'description' => $enum?->description(),
            'is_system' => $enum !== null,
            'permissions' => $role->permissions->pluck('name')->values()->all(),
            'users_count' => method_exists($role, 'users') ? $role->users()->count() : null,
        ];
    }
}
