<?php

namespace App\Services\Auth;

use App\Enums\Availability;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DemoAuthService
{
    public function enabled(): bool
    {
        return (bool) config('demo_auth.enabled', false);
    }

    /**
     * @return array{otp: string, role: string, name: string, email: string}|null
     */
    public function accountForPhone(string $phone): ?array
    {
        if (! $this->enabled()) {
            return null;
        }

        $normalized = $this->normalizePhone($phone);
        $account = config("demo_auth.accounts.{$normalized}");

        return is_array($account) ? $account : null;
    }

    /**
     * @return list<array{phone: string, otp: string, role: string, label: string}>
     */
    public function publicAccounts(): array
    {
        if (! $this->enabled()) {
            return [];
        }

        $labels = [
            'agent' => 'کارشناس',
            'leader' => 'سرتیم',
            'supervisor' => 'ناظر',
            'manager' => 'مدیر',
            'admin' => 'مدیر',
        ];

        return collect(config('demo_auth.accounts', []))
            ->map(fn (array $account, string $phone) => [
                'phone' => $phone,
                'otp' => $account['otp'],
                'role' => $account['role'],
                'label' => $labels[$account['role']] ?? $account['role'],
            ])
            ->values()
            ->all();
    }

    public function ensureDemoUser(string $phone): User
    {
        $account = $this->accountForPhone($phone);
        if ($account === null) {
            throw new \RuntimeException('حساب دمو برای این شماره تعریف نشده است.');
        }

        $normalized = $this->normalizePhone($phone);
        $user = User::query()->firstOrNew(['phone' => $normalized]);

        if (! $user->exists) {
            $user->fill([
                'name' => $account['name'],
                'email' => $account['email'],
                'password' => Hash::make(Str::random(40)),
                'availability' => Availability::Offline,
                'call_goal' => 25,
                'is_active' => true,
            ]);
            $user->save();
            $user->syncRoles([$account['role']]);
            Wallet::query()->firstOrCreate(['user_id' => $user->id]);
        } else {
            $user->syncRoles([$account['role']]);
        }

        return $user->fresh();
    }

    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if (str_starts_with($digits, '98') && strlen($digits) === 12) {
            return '0'.substr($digits, 2);
        }

        return $digits;
    }
}
