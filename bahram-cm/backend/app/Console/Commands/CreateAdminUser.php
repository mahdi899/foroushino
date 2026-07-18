<?php

namespace App\Console\Commands;

use App\Enums\AdminRoleName;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

/**
 * Production bootstrap intentionally does NOT run the demo `DatabaseSeeder`
 * (it ships a well-known `admin@bahram.local` / `password` account plus
 * fake commerce/family data). This command creates the first real
 * super-admin interactively instead — see docs/DEPLOYMENT.md.
 */
class CreateAdminUser extends Command
{
    protected $signature = 'app:create-admin {--email=} {--mobile=} {--name=}';

    protected $description = 'Create (or promote) a super-admin user — interactive password prompt, never logged.';

    public function handle(): int
    {
        $email = $this->option('email') ?: $this->ask('ایمیل ادمین');
        $mobile = $this->option('mobile') ?: $this->ask('موبایل ادمین (۰۹...)');
        $name = $this->option('name') ?: $this->ask('نام نمایشی', 'مدیر کل');

        $validator = Validator::make(
            ['email' => $email, 'mobile' => $mobile],
            ['email' => ['required', 'email'], 'mobile' => ['required', 'regex:/^09\d{9}$/']],
        );

        if ($validator->fails()) {
            $this->error($validator->errors()->first());

            return self::FAILURE;
        }

        $password = $this->secret('رمز عبور (حداقل ۱۲ کاراکتر)');
        $confirm = $this->secret('تکرار رمز عبور');

        if ($password !== $confirm) {
            $this->error('رمزها یکسان نیستند.');

            return self::FAILURE;
        }

        if (mb_strlen((string) $password) < 12) {
            $this->error('رمز باید حداقل ۱۲ کاراکتر باشد.');

            return self::FAILURE;
        }

        $existing = User::query()->where('email', $email)->orWhere('mobile', $mobile)->first();
        if ($existing && ! $this->confirm("کاربری با این ایمیل/موبایل موجود است ({$existing->email}). بروزرسانی شود؟")) {
            return self::FAILURE;
        }

        $admin = User::query()->updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'mobile' => $mobile,
                'mobile_verified_at' => now(),
                'password' => Hash::make($password),
                'is_admin' => true,
                'remember_token' => Str::random(60),
            ],
        );

        if (method_exists($admin, 'syncRoles')) {
            $admin->syncRoles([AdminRoleName::SuperAdmin->value]);
        }

        $this->info("ادمین ساخته/به‌روزرسانی شد: {$admin->email}");

        return self::SUCCESS;
    }
}
