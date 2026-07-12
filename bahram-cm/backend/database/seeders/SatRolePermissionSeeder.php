<?php

namespace Database\Seeders;

use App\Enums\SatRoleName;
use App\Support\SatPermissionCatalog;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class SatRolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (SatPermissionCatalog::all() as $permission) {
            Permission::query()->firstOrCreate([
                'name' => $permission,
                'guard_name' => SatPermissionCatalog::GUARD,
            ]);
        }

        foreach (SatRoleName::cases() as $roleName) {
            Role::query()->firstOrCreate([
                'name' => $roleName->value,
                'guard_name' => SatPermissionCatalog::GUARD,
            ]);
        }

        $this->syncRolePermissions();
    }

    private function syncRolePermissions(): void
    {
        $all = SatPermissionCatalog::all();

        Role::findByName(SatRoleName::SuperAdmin->value, SatPermissionCatalog::GUARD)
            ->syncPermissions($all);

        Role::findByName(SatRoleName::Management->value, SatPermissionCatalog::GUARD)
            ->syncPermissions([
                'sat.leads.view_all', 'sat.leads.manage_all', 'sat.leads.create',
                'sat.calls.view_all', 'sat.calls.create', 'sat.calls.review',
                'sat.activities.view_all', 'sat.activities.create',
                'sat.activities.approve', 'sat.activities.reject',
                'sat.staff.view', 'sat.staff.create_specialist', 'sat.staff.create_leader', 'sat.staff.manage',
                'sat.deposits.view', 'sat.deposits.manage',
                'sat.withdrawals.view', 'sat.withdrawals.approve',
                'sat.audit.view',
            ]);

        Role::findByName(SatRoleName::Leader->value, SatPermissionCatalog::GUARD)
            ->syncPermissions([
                'sat.leads.view_team', 'sat.leads.manage_team',
                'sat.calls.view_team', 'sat.calls.create', 'sat.calls.review',
                'sat.activities.view_team', 'sat.activities.create',
                'sat.activities.approve', 'sat.activities.reject',
                'sat.staff.view',
            ]);

        Role::findByName(SatRoleName::Specialist->value, SatPermissionCatalog::GUARD)
            ->syncPermissions([
                'sat.leads.view_own', 'sat.leads.manage_own',
                'sat.calls.view_own', 'sat.calls.create',
                'sat.activities.view_own', 'sat.activities.create',
            ]);
    }
}
