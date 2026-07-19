<?php

namespace App\Console\Commands;

use App\Enums\AdminRoleName;
use App\Models\User;
use App\Support\BootstrapAdmin;
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
    protected $signature = 'app:create-admin
        {--email= : Admin email}
        {--mobile= : Admin mobile (09xxxxxxxxx)}
        {--name= : Display name}
        {--password= : Password (min 12 chars; omit for interactive prompt)}
        {--skip-otp : Skip SMS OTP on admin/sat/flutter login for this account}
        {--root : Mark as root super-admin (full access, can delete other super-admins)}';

    protected $description = 'Create (or promote) a super-admin user — interactive password prompt, never logged.';

    public function handle(): int
    {
        $email = strtolower((string) ($this->option('email') ?: $this->ask('ایمیل ادمین')));
        $mobile = (string) ($this->option('mobile') ?: $this->ask('موبایل ادمین (۰۹...)'));
        $name = (string) ($this->option('name') ?: $this->ask('نام نمایشی', 'مدیر کل'));

        $validator = Validator::make(
            ['email' => $email, 'mobile' => $mobile],
            ['email' => ['required', 'email'], 'mobile' => ['required', 'regex:/^09\d{9}$/']],
        );

        if ($validator->fails()) {
            $this->error($validator->errors()->first());

            return self::FAILURE;
        }

        $password = $this->option('password');
        if ($password === null) {
            $password = $this->secret('رمز عبور (حداقل ۱۲ کاراکتر)');
            $confirm = $this->secret('تکرار رمز عبور');

            if ($password !== $confirm) {
                $this->error('رمزها یکسان نیستند.');

                return self::FAILURE;
            }
        }

        if (mb_strlen((string) $password) < 12) {
            $this->error('رمز باید حداقل ۱۲ کاراکتر باشد.');

            return self::FAILURE;
        }

        $existing = User::query()
            ->where('email', $email)
            ->orWhere('mobile', $mobile)
            ->first();
        $autoConfirm = $this->option('no-interaction')
            || ($this->option('email') && $this->option('mobile') && $this->option('password'));
        if ($existing && ! $autoConfirm && ! $this->confirm("کاربری با این ایمیل/موبایل موجود است ({$existing->email}). بروزرسانی شود؟")) {
            return self::FAILURE;
        }

        $skipOtp = $this->option('skip-otp');
        $isRoot = $this->option('root') || BootstrapAdmin::isRootEmail($email);

        $lookup = $existing ? ['id' => $existing->id] : ['email' => $email];

        $admin = User::query()->updateOrCreate(
            $lookup,
            [
                'name' => $name,
                'email' => $email,
                'mobile' => $mobile,
                'mobile_verified_at' => now(),
                'password' => Hash::make($password),
                'is_admin' => true,
                'admin_login_otp_exempt' => $skipOtp,
                'is_root_admin' => $isRoot,
                'remember_token' => Str::random(60),
            ],
        );

        if (method_exists($admin, 'syncRoles')) {
            $admin->syncRoles([AdminRoleName::SuperAdmin->value]);
        }

        $this->info("ادمین ساخته/به‌روزرسانی شد: {$admin->email}");
        if ($skipOtp) {
            $this->line('ورود بدون OTP فعال است (admin_login_otp_exempt).');
        }
        if ($isRoot) {
            $this->line('Root super-admin فعال است (is_root_admin).');
        }

        return self::SUCCESS;
    }
}
