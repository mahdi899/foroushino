<?php

namespace App\Console\Commands;

use App\Enums\RoleName;
use App\Models\User;
use App\Support\PhoneNormalizer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class SetStaffPasswordCommand extends Command
{
    protected $signature = 'saat:set-staff-password
        {phone : Mobile number (09xxxxxxxxx)}
        {--password= : New password (min 12 chars)}';

    protected $description = 'Enable password login for an existing staff user (supervisor, leader, agent, etc.).';

    public function handle(): int
    {
        $phone = PhoneNormalizer::normalize((string) $this->argument('phone'));
        $password = (string) ($this->option('password') ?: $this->secret('رمز عبور جدید (حداقل ۱۲ کاراکتر)'));

        $validator = Validator::make(
            ['phone' => $phone, 'password' => $password],
            [
                'phone' => ['required', 'regex:/^09\d{9}$/'],
                'password' => ['required', 'string', 'min:12', 'max:128'],
            ],
        );

        if ($validator->fails()) {
            $this->error($validator->errors()->first());

            return self::FAILURE;
        }

        $user = User::query()->where('phone', $phone)->first();
        if (! $user) {
            $this->error("کاربری با شماره {$phone} یافت نشد.");

            return self::FAILURE;
        }

        if (! $user->hasAnyRole(RoleName::passwordLoginAtCreationValues())) {
            $this->error('این کاربر نقش پرسنلی ندارد یا مجاز به ورود با رمز نیست.');

            return self::FAILURE;
        }

        $user->forceFill([
            'password' => Hash::make($password),
            'phone_otp_exempt' => true,
        ])->save();

        $this->info("ورود با رمز برای {$user->name} ({$phone}) فعال شد.");

        return self::SUCCESS;
    }
}
