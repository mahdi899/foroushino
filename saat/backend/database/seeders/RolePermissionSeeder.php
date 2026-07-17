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
        'sales' => ['sales.view', 'sales.view-own', 'sales.view-team', 'sales.manage', 'sales.confirm', 'sales.review-payment', 'sales.register-payment'],
        'wallet' => ['wallet.view', 'wallet.view-own', 'wallet.view-team', 'wallet.manage-payouts'],
        'commissions' => ['commissions.approve-leader', 'commissions.approve-supervisor'],
        'reports' => ['reports.view', 'reports.view-team', 'reports.view-all', 'reports.submit-team', 'reports.approve-team', 'reports.submit-agent', 'reports.approve-agent'],
        'users' => ['users.view', 'users.manage', 'users.manage-team', 'users.manage-team-roster', 'teams.manage'],
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

        Role::findByName(RoleName::Admin->value)->syncPermissions($all); // legacy alias of manager

        Role::findByName(RoleName::Manager->value)->syncPermissions($all);

        Role::findByName(RoleName::Supervisor->value)->syncPermissions([
            'leads.view', 'leads.view-team', 'leads.manage', 'leads.import', 'leads.reassign',
            'calls.view', 'followups.view',
            'sales.view', 'sales.view-team', 'sales.confirm', 'sales.review-payment', 'sales.register-payment',
            'wallet.view', 'wallet.view-team', 'wallet.manage-payouts',
            'commissions.approve-supervisor',
            'reports.view', 'reports.view-team', 'reports.approve-team',
            'users.view', 'users.manage-team',
            'teams.manage',
            'training.view', 'training.manage',
        ]);

        Role::findByName(RoleName::Leader->value)->syncPermissions([
            'leads.view', 'leads.view-team',
            'calls.view', 'followups.view',
            'sales.view', 'sales.view-team', 'sales.review-payment',
            'wallet.view', 'wallet.view-team',
            'commissions.approve-leader',
            'reports.view', 'reports.view-team', 'reports.submit-team', 'reports.approve-agent',
            'users.view', 'users.manage-team-roster',
            'training.view',
        ]);

        Role::findByName(RoleName::Agent->value)->syncPermissions([
            'leads.view', 'leads.view-own',
            'calls.view', 'calls.manage',
            'followups.view', 'followups.manage',
            'sales.view', 'sales.view-own', 'sales.manage',
            'wallet.view', 'wallet.view-own',
            'reports.submit-agent',
            'training.view',
        ]);
    }
}
