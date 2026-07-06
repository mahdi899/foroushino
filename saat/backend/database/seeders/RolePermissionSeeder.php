<?php

namespace Database\Seeders;

use App\Enums\RoleName;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    /**
     * @var array<string, array<int, string>>
     */
    private array $permissionGroups = [
        'leads' => ['leads.view', 'leads.view-own', 'leads.view-team', 'leads.manage', 'leads.import', 'leads.reassign'],
        'calls' => ['calls.view', 'calls.manage'],
        'followups' => ['followups.view', 'followups.manage'],
        'sales' => ['sales.view', 'sales.view-own', 'sales.view-team', 'sales.manage', 'sales.confirm'],
        'wallet' => ['wallet.view', 'wallet.view-own', 'wallet.view-team', 'wallet.manage-payouts'],
        'reports' => ['reports.view', 'reports.view-team', 'reports.view-all'],
        'users' => ['users.view', 'users.manage', 'teams.manage'],
        'training' => ['training.view', 'training.manage'],
        'admin' => ['admin.settings', 'admin.products'],
    ];

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (RoleName::values() as $role) {
            Role::query()->firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $all = [];
        foreach ($this->permissionGroups as $group) {
            foreach ($group as $permission) {
                Permission::query()->firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
                $all[] = $permission;
            }
        }

        Role::findByName(RoleName::Admin->value)->syncPermissions($all);

        Role::findByName(RoleName::Manager->value)->syncPermissions([
            'leads.view', 'leads.manage', 'leads.import', 'leads.reassign',
            'calls.view', 'followups.view',
            'sales.view', 'sales.confirm',
            'wallet.view', 'wallet.manage-payouts',
            'reports.view', 'reports.view-team', 'reports.view-all',
            'users.view', 'users.manage', 'teams.manage',
            'training.view', 'training.manage',
            'admin.products',
        ]);

        Role::findByName(RoleName::Supervisor->value)->syncPermissions([
            'leads.view', 'leads.view-team', 'leads.reassign',
            'calls.view', 'followups.view',
            'sales.view', 'sales.view-team', 'sales.confirm',
            'wallet.view', 'wallet.view-team',
            'reports.view', 'reports.view-team',
            'users.view',
            'training.view', 'training.manage',
        ]);

        Role::findByName(RoleName::Leader->value)->syncPermissions([
            'leads.view', 'leads.view-team',
            'calls.view', 'followups.view',
            'sales.view', 'sales.view-team',
            'wallet.view', 'wallet.view-team',
            'reports.view', 'reports.view-team',
            'training.view',
        ]);

        Role::findByName(RoleName::Agent->value)->syncPermissions([
            'leads.view', 'leads.view-own',
            'calls.view', 'calls.manage',
            'followups.view', 'followups.manage',
            'sales.view', 'sales.view-own', 'sales.manage',
            'wallet.view', 'wallet.view-own',
            'training.view',
        ]);
    }
}
