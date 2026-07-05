<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $roles = [
            'admin',
            'team-lead',
            'agent',
        ];

        foreach ($roles as $role) {
            Role::query()->firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $permissions = [
            'leads.view',
            'leads.manage',
            'calls.view',
            'calls.manage',
            'reports.view',
            'wallet.view',
        ];

        foreach ($permissions as $permission) {
            Permission::query()->firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        Role::findByName('admin')->givePermissionTo($permissions);
        Role::findByName('team-lead')->givePermissionTo([
            'leads.view',
            'leads.manage',
            'calls.view',
            'calls.manage',
            'reports.view',
        ]);
        Role::findByName('agent')->givePermissionTo([
            'leads.view',
            'calls.view',
            'calls.manage',
        ]);
    }
}
