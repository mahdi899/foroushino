<?php

namespace Database\Seeders;

use App\Enums\AdminRoleName;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Dev-only demo admin accounts — one login per predefined role.
 * Password for all: password
 * Login: mobile OTP (see mobile column)
 */
class DemoRoleAdminSeeder extends Seeder
{
    public function run(): void
    {
        $accounts = [
            [AdminRoleName::Admin, 'role.admin@bahram.local', 'ادمین (تست)', '09121000002'],
            [AdminRoleName::Finance, 'role.finance@bahram.local', 'مالی (تست)', '09121000003'],
            [AdminRoleName::ContentManager, 'role.content@bahram.local', 'مدیر محتوا (تست)', '09121000004'],
            [AdminRoleName::KycOperator, 'role.kyc@bahram.local', 'کارشناس احراز (تست)', '09121000005'],
            [AdminRoleName::ReadOnly, 'role.readonly@bahram.local', 'ناظر (تست)', '09121000006'],
            [AdminRoleName::StudentManager, 'role.students@bahram.local', 'مدیر دانشجویان (تست)', '09121000007'],
            [AdminRoleName::Support, 'role.support@bahram.local', 'پشتیبانی (تست)', '09121000008'],
        ];

        foreach ($accounts as [$role, $email, $name, $mobile]) {
            $user = User::query()->updateOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'mobile' => $mobile,
                    'mobile_verified_at' => now(),
                    'password' => Hash::make('password'),
                ],
            );

            if (! $user->is_admin) {
                $user->is_admin = true;
                $user->save();
            }

            $user->syncRoles([$role->value]);
        }
    }
}
