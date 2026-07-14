<?php

namespace Database\Seeders;

use App\Enums\AdminRoleName;
use App\Models\User;
use App\Support\FamilyPermissionCatalog;
use App\Support\PermissionCatalog;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (PermissionCatalog::all() as $permission) {
            Permission::query()->firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web',
            ]);
        }

        foreach (AdminRoleName::cases() as $roleName) {
            Role::query()->firstOrCreate([
                'name' => $roleName->value,
                'guard_name' => 'web',
            ]);
        }

        $this->syncRolePermissions();
        $this->assignExistingAdmins();
    }

    private function syncRolePermissions(): void
    {
        $all = PermissionCatalog::all();

        Role::findByName(AdminRoleName::SuperAdmin->value)->syncPermissions($all);

        Role::findByName(AdminRoleName::Admin->value)->syncPermissions([
            'students.view', 'students.manage', 'students.search_by_mobile',
            'identity.view',
            'sat.view', 'sat.manage',
            'finance.view', 'finance.manage',
            'content.view', 'content.manage',
            ...FamilyPermissionCatalog::all(),
            'sms.view', 'sms.manage',
            'tickets.view', 'tickets.manage',
            'orders.view', 'orders.manage',
            'settings.view', 'settings.manage',
            'roles.view', 'roles.manage', 'permissions.view',
            'audit.view',
            'identity_provider.view',
        ]);

        Role::findByName(AdminRoleName::StudentManager->value)->syncPermissions([
            'students.view', 'students.manage', 'students.view_full_mobile', 'students.search_by_mobile',
            'sat.view',
            'tickets.view', 'tickets.manage',
            'orders.view',
        ]);

        Role::findByName(AdminRoleName::KycOperator->value)->syncPermissions([
            'students.view', 'students.search_by_mobile',
            'identity.view', 'identity.review', 'identity.approve', 'identity.reject',
            'identity.request_correction', 'identity.view_national_code',
            'identity.view_sensitive_documents', 'identity.unlock_ownership_verification',
        ]);

        Role::findByName(AdminRoleName::Support->value)->syncPermissions([
            'students.view', 'students.search_by_mobile',
            'tickets.view', 'tickets.manage',
            'orders.view',
            'sat.view',
        ]);

        Role::findByName(AdminRoleName::ContentManager->value)->syncPermissions([
            'content.view', 'content.manage',
        ]);

        Role::findByName(AdminRoleName::FamilyManager->value)->syncPermissions(
            FamilyPermissionCatalog::all()
        );

        Role::findByName(AdminRoleName::Finance->value)->syncPermissions([
            'students.view', 'students.search_by_mobile',
            'finance.view', 'finance.manage', 'finance.view_payout_card',
            'orders.view', 'orders.manage',
        ]);

        Role::findByName(AdminRoleName::ReadOnly->value)->syncPermissions([
            'students.view',
            'identity.view',
            'sat.view',
            'finance.view',
            'content.view',
            'sms.view',
            'tickets.view',
            'orders.view',
            'audit.view',
            'roles.view',
            'permissions.view',
        ]);
    }

    private function assignExistingAdmins(): void
    {
        User::query()
            ->where('is_admin', true)
            ->orderBy('id')
            ->chunkById(100, function ($users): void {
                foreach ($users as $user) {
                    if (! $user->hasRole(AdminRoleName::SuperAdmin->value)) {
                        $user->assignRole(AdminRoleName::SuperAdmin->value);
                    }
                }
            });
    }
}
