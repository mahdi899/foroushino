<?php

namespace App\Support;

/**
 * Canonical SAT call-center permission names (guard: sat).
 */
final class SatPermissionCatalog
{
    public const GUARD = 'sat';

    /** @return array<string, list<string>> */
    public static function groups(): array
    {
        return [
            'Leads' => [
                'sat.leads.view_own',
                'sat.leads.view_team',
                'sat.leads.view_all',
                'sat.leads.manage_own',
                'sat.leads.manage_team',
                'sat.leads.manage_all',
                'sat.leads.create',
            ],
            'Calls' => [
                'sat.calls.view_own',
                'sat.calls.view_team',
                'sat.calls.view_all',
                'sat.calls.create',
                'sat.calls.review',
            ],
            'Activities' => [
                'sat.activities.view_own',
                'sat.activities.view_team',
                'sat.activities.view_all',
                'sat.activities.create',
                'sat.activities.approve',
                'sat.activities.reject',
            ],
            'Staff' => [
                'sat.staff.view',
                'sat.staff.create_specialist',
                'sat.staff.create_leader',
                'sat.staff.manage',
            ],
            'Finance' => [
                'sat.deposits.view',
                'sat.deposits.manage',
                'sat.withdrawals.view',
                'sat.withdrawals.approve',
            ],
            'System' => [
                'sat.roles.manage',
                'sat.settings.manage',
                'sat.audit.view',
            ],
        ];
    }

    /** @return list<string> */
    public static function all(): array
    {
        return array_values(array_unique(array_merge(...array_values(self::groups()))));
    }

    /** @return list<string> */
    public static function reservedForSuperAdmin(): array
    {
        return [
            'sat.roles.manage',
            'sat.settings.manage',
        ];
    }

    public static function label(string $permission): string
    {
        return match ($permission) {
            'sat.leads.view_own' => 'مشاهده سرنخ‌های خود',
            'sat.leads.view_team' => 'مشاهده سرنخ‌های تیم',
            'sat.leads.view_all' => 'مشاهده همه سرنخ‌ها',
            'sat.leads.manage_own' => 'مدیریت سرنخ‌های خود',
            'sat.leads.manage_team' => 'مدیریت سرنخ‌های تیم',
            'sat.leads.manage_all' => 'مدیریت همه سرنخ‌ها',
            'sat.leads.create' => 'افزودن سرنخ',
            'sat.calls.view_own' => 'مشاهده تماس‌های خود',
            'sat.calls.view_team' => 'مشاهده تماس‌های تیم',
            'sat.calls.view_all' => 'مشاهده همه تماس‌ها',
            'sat.calls.create' => 'ثبت تماس',
            'sat.calls.review' => 'بررسی تماس‌های تیم',
            'sat.activities.view_own' => 'مشاهده فعالیت‌های خود',
            'sat.activities.view_team' => 'مشاهده فعالیت‌های تیم',
            'sat.activities.view_all' => 'مشاهده همه فعالیت‌ها',
            'sat.activities.create' => 'ثبت فعالیت',
            'sat.activities.approve' => 'تأیید فعالیت',
            'sat.activities.reject' => 'رد فعالیت',
            'sat.staff.view' => 'مشاهده پرسنل',
            'sat.staff.create_specialist' => 'افزودن کارشناس',
            'sat.staff.create_leader' => 'افزودن لیدر',
            'sat.staff.manage' => 'مدیریت پرسنل',
            'sat.deposits.view' => 'مشاهده واریزی‌ها',
            'sat.deposits.manage' => 'مدیریت واریزی‌ها',
            'sat.withdrawals.view' => 'مشاهده برداشت‌ها',
            'sat.withdrawals.approve' => 'تأیید/رد برداشت',
            'sat.roles.manage' => 'مدیریت نقش‌های سات',
            'sat.settings.manage' => 'تنظیمات سات',
            'sat.audit.view' => 'مشاهده لاگ عملیات',
            default => $permission,
        };
    }
}
