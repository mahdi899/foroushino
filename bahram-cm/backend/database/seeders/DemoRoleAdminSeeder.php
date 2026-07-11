<?php

namespace Database\Seeders;

use App\Enums\AdminRoleName;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Dev-only demo admin accounts — one login per predefined role.
 * Password for all: password
 */
class DemoRoleAdminSeeder extends Seeder
{
    public function run(): void
    {
        $accounts = [
            [AdminRoleName::Admin, 'role.admin@bahram.local', 'ادمین (تست)'],
            [AdminRoleName::Finance, 'role.finance@bahram.local', 'مالی (تست)'],
            [AdminRoleName::ContentManager, 'role.content@bahram.local', 'مدیر محتوا (تست)'],
            [AdminRoleName::KycOperator, 'role.kyc@bahram.local', 'کارشناس احراز (تست)'],
            [AdminRoleName::ReadOnly, 'role.readonly@bahram.local', 'ناظر (تست)'],
            [AdminRoleName::StudentManager, 'role.students@bahram.local', 'مدیر دانشجویان (تست)'],
            [AdminRoleName::Support, 'role.support@bahram.local', 'پشتیبانی (تست)'],
        ];

        foreach ($accounts as [$role, $email, $name]) {
            $user = User::query()->updateOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'password' => Hash::make('password'),
                    'is_admin' => true,
                ],
            );

            $user->syncRoles([$role->value]);
        }
    }
}
