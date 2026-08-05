<?php

namespace App\Support;

use App\Models\User;

/**
 * Canonical bootstrap / root-admin identity (see frontend/bootstrapAdmin.ts).
 *
 * Root admin ("مدیر اصلی") is locked to a single mobile number — not an email
 * and not a transferable DB flag alone.
 */
final class BootstrapAdmin
{
    public const EMAIL = 'shokspy@gmail.com';

    public const MOBILE = '09367018089';

    public static function isRootEmail(?string $email): bool
    {
        return strtolower((string) $email) === self::EMAIL;
    }

    public static function isRootMobile(?string $mobile): bool
    {
        $normalized = Mobile::normalize($mobile);

        return $normalized !== null && $normalized === self::MOBILE;
    }

    /**
     * Keep the denormalized is_root_admin column aligned with the mobile lock.
     * Safe to re-run (seeders / create-admin).
     */
    public static function syncRootAdminFlags(): void
    {
        User::query()
            ->where('is_root_admin', true)
            ->where(function ($q): void {
                $q->whereNull('mobile')->orWhere('mobile', '!=', self::MOBILE);
            })
            ->update(['is_root_admin' => false]);

        User::query()
            ->where('mobile', self::MOBILE)
            ->where('is_admin', true)
            ->update(['is_root_admin' => true]);
    }
}
