<?php

namespace Database\Seeders;

use App\Enums\SatRoleName;
use App\Models\User;
use App\Support\SatPermissionCatalog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class DemoSatStaffSeeder extends Seeder
{
    public function run(): void
    {
        $superAdmin = User::query()->updateOrCreate(
            ['email' => 'sat-admin@bahram.local'],
            [
                'name' => 'ادمین کل سات',
                'mobile' => '09121000010',
                'mobile_verified_at' => now(),
                'password' => Hash::make('password'),
                'is_admin' => false,
                'is_sat_staff' => true,
                'status' => 'active',
            ]
        );
        $superAdmin->syncRoles([Role::findByName(SatRoleName::SuperAdmin->value, SatPermissionCatalog::GUARD)]);

        $management = User::query()->updateOrCreate(
            ['email' => 'sat-mgmt@bahram.local'],
            [
                'name' => 'مدیریت سات',
                'mobile' => '09121000011',
                'mobile_verified_at' => now(),
                'password' => Hash::make('password'),
                'is_admin' => false,
                'is_sat_staff' => true,
                'status' => 'active',
            ]
        );
        $management->syncRoles([Role::findByName(SatRoleName::Management->value, SatPermissionCatalog::GUARD)]);

        $leader = User::query()->updateOrCreate(
            ['email' => 'sat-leader@bahram.local'],
            [
                'name' => 'لیدر تیم الف',
                'mobile' => '09121000012',
                'mobile_verified_at' => now(),
                'password' => Hash::make('password'),
                'is_admin' => false,
                'is_sat_staff' => true,
                'status' => 'active',
            ]
        );
        $leader->syncRoles([Role::findByName(SatRoleName::Leader->value, SatPermissionCatalog::GUARD)]);

        $specialist = User::query()->updateOrCreate(
            ['email' => 'sat-agent@bahram.local'],
            [
                'name' => 'کارشناس نمونه',
                'mobile' => '09121000013',
                'mobile_verified_at' => now(),
                'password' => Hash::make('password'),
                'is_admin' => false,
                'is_sat_staff' => true,
                'sat_leader_id' => $leader->id,
                'status' => 'active',
            ]
        );
        $specialist->syncRoles([Role::findByName(SatRoleName::Specialist->value, SatPermissionCatalog::GUARD)]);
    }
}
