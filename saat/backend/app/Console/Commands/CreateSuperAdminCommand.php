<?php

namespace App\Console\Commands;

use App\Enums\RoleName;
use App\Models\User;
use App\Models\Wallet;
use App\Support\BootstrapAdmin;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class CreateSuperAdminCommand extends Command
{
    protected $signature = 'saat:create-super-admin
        {--email= : Admin email}
        {--mobile= : Admin mobile (09xxxxxxxxx)}
        {--name= : Display name}
        {--password= : Password (min 12 chars)}
        {--skip-otp : Allow phone login without Telegram OTP verification}';

    protected $description = 'Create (or update) the default super-admin (admin role, full permissions).';

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

        $normalizedPhone = preg_replace('/\D+/', '', $mobile) ?? $mobile;
        if (str_starts_with($normalizedPhone, '98') && strlen($normalizedPhone) === 12) {
            $normalizedPhone = '0'.substr($normalizedPhone, 2);
        }

        $existing = User::query()
            ->where('email', $email)
            ->orWhere('phone', $normalizedPhone)
            ->first();

        $autoConfirm = $this->option('no-interaction')
            && $this->option('email')
            && $this->option('mobile')
            && $this->option('password');

        if ($existing && ! $autoConfirm && ! $this->confirm("کاربری با این ایمیل/موبایل موجود است ({$existing->email}). بروزرسانی شود؟")) {
            return self::FAILURE;
        }

        $skipOtp = $this->option('skip-otp') || BootstrapAdmin::isRootEmail($email);

        $lookup = $existing ? ['id' => $existing->id] : ['email' => $email];

        $admin = User::query()->updateOrCreate(
            $lookup,
            [
                'name' => $name,
                'email' => $email,
                'phone' => $normalizedPhone,
                'password' => Hash::make($password),
                'email_verified_at' => now(),
                'is_active' => true,
                'phone_otp_exempt' => $skipOtp,
            ],
        );

        $admin->syncRoles([RoleName::SuperAdmin->value]);
        Wallet::query()->firstOrCreate(['user_id' => $admin->id]);

        $this->info("سوپرادمین ساخته/به‌روزرسانی شد: {$admin->email} (نقش: super-admin)");
        if ($skipOtp) {
            $this->line('ورود با شماره موبایل + رمز عبور فعال است (phone_otp_exempt).');
        }

        return self::SUCCESS;
    }
}
