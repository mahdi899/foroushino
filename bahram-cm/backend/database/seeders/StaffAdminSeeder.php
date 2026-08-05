<?php

namespace Database\Seeders;

use App\Enums\AdminRoleName;
use App\Models\User;
use App\Support\BootstrapAdmin;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Persistent staff super-admin accounts that must survive deploy/seed.
 * Safe to re-run: creates missing accounts; never overwrites an existing password.
 *
 * Root admin ("مدیر اصلی") is locked to BootstrapAdmin::MOBILE only.
 */
class StaffAdminSeeder extends Seeder
{
    public function run(): void
    {
        $accounts = [
            [
                'email' => 'admin@bahram.local',
                'name' => 'مدیر بهرام',
                'mobile' => '09056013977',
                'password' => 'Bahram#123',
            ],
            [
                'email' => 'w.m.akbari@gmail.com',
                'name' => 'مهدی اکبری',
                'mobile' => BootstrapAdmin::MOBILE,
                'password' => 'Mahdiadmi#123',
            ],
        ];

        foreach ($accounts as $account) {
            $email = strtolower($account['email']);
            $isRoot = BootstrapAdmin::isRootMobile($account['mobile']);
            $existing = User::query()->where('email', $email)->first();

            if ($existing) {
                $existing->fill([
                    'name' => $account['name'],
                    'mobile' => $account['mobile'],
                    'mobile_verified_at' => $existing->mobile_verified_at ?? now(),
                    'is_admin' => true,
                    'is_root_admin' => $isRoot,
                    'status' => 'active',
                ]);
                $existing->save();
                $existing->syncRoles([AdminRoleName::SuperAdmin->value]);

                continue;
            }

            $admin = User::query()->create([
                'email' => $email,
                'name' => $account['name'],
                'mobile' => $account['mobile'],
                'mobile_verified_at' => now(),
                'password' => Hash::make($account['password']),
                'is_admin' => true,
                'is_root_admin' => $isRoot,
                'admin_login_otp_exempt' => false,
                'remember_token' => Str::random(60),
                'status' => 'active',
            ]);

            $admin->syncRoles([AdminRoleName::SuperAdmin->value]);
        }

        BootstrapAdmin::syncRootAdminFlags();
    }
}
