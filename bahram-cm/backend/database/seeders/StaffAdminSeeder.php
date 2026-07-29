<?php

namespace Database\Seeders;

use App\Enums\AdminRoleName;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Persistent staff super-admin accounts that must survive deploy/seed.
 * Safe to re-run: updateOrCreate by email.
 */
class StaffAdminSeeder extends Seeder
{
    public function run(): void
    {
        $accounts = [
            [
                'email' => 'w.m.akbari@gmail.com',
                'name' => 'مهدی اکبری',
                'mobile' => '09367018089',
                'password' => 'Mahdiadmi#123',
            ],
        ];

        foreach ($accounts as $account) {
            $email = strtolower($account['email']);

            $admin = User::query()->updateOrCreate(
                ['email' => $email],
                [
                    'name' => $account['name'],
                    'mobile' => $account['mobile'],
                    'mobile_verified_at' => now(),
                    'password' => Hash::make($account['password']),
                    'is_admin' => true,
                    'admin_login_otp_exempt' => false,
                    'remember_token' => Str::random(60),
                    'status' => 'active',
                ],
            );

            $admin->syncRoles([AdminRoleName::SuperAdmin->value]);
        }
    }
}
