<?php

namespace App\Support;

/**
 * Canonical admin permission names grouped by module.
 * Reserved (Super Admin only assignable): students.export, students.export_sensitive_data
 */
final class PermissionCatalog
{
    /** @return array<string, list<string>> */
    public static function groups(): array
    {
        return [
            'Students' => [
                'students.view',
                'students.manage',
                'students.view_full_mobile',
                'students.search_by_mobile',
                'students.export',
                'students.export_sensitive_data',
            ],
            'Identity Verification' => [
                'identity.view',
                'identity.review',
                'identity.approve',
                'identity.reject',
                'identity.request_correction',
                'identity.view_national_code',
                'identity.view_sensitive_documents',
                'identity.override_level',
                'identity.unlock_ownership_verification',
            ],
            'Identity Providers' => [
                'identity_provider.view',
                'identity_provider.manage',
                'identity_provider.test',
            ],
            'SAT' => [
                'sat.view',
                'sat.manage',
            ],
            'Finance' => [
                'finance.view',
                'finance.manage',
                'finance.view_payout_card',
            ],
            'Content' => [
                'content.view',
                'content.manage',
            ],
            'Family' => FamilyPermissionCatalog::all(),
            'SMS' => [
                'sms.view',
                'sms.manage',
            ],
            'Audit' => [
                'audit.view',
            ],
            'Roles & Permissions' => [
                'roles.view',
                'roles.manage',
                'permissions.view',
                'permissions.manage',
            ],
            'Admins' => [
                'admins.view_email',
                'admins.create',
                'admins.assign_role',
                'admins.delete',
            ],
            'Support' => [
                'tickets.view',
                'tickets.manage',
            ],
            'Orders' => [
                'orders.view',
                'orders.manage',
            ],
            'Settings' => [
                'settings.view',
                'settings.manage',
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
            'students.export',
            'students.export_sensitive_data',
            'identity.override_level',
            'roles.manage',
            'permissions.manage',
            'identity_provider.manage',
        ];
    }

    public static function moduleFor(string $permission): string
    {
        foreach (self::groups() as $module => $permissions) {
            if (in_array($permission, $permissions, true)) {
                return $module;
            }
        }

        return 'Other';
    }

    public static function label(string $permission): string
    {
        return match ($permission) {
            'students.view' => 'مشاهده دانشجویان',
            'students.manage' => 'مدیریت دانشجویان',
            'students.view_full_mobile' => 'نمایش شماره کامل (Reveal)',
            'students.search_by_mobile' => 'جستجو با شماره موبایل',
            'students.export' => 'خروجی لیست دانشجویان',
            'students.export_sensitive_data' => 'خروجی داده‌های حساس دانشجویان',
            'identity.view' => 'مشاهده پرونده‌های احراز هویت',
            'identity.review' => 'بررسی پرونده احراز هویت',
            'identity.approve' => 'تأیید احراز هویت',
            'identity.reject' => 'رد احراز هویت',
            'identity.request_correction' => 'درخواست اصلاح',
            'identity.view_national_code' => 'نمایش کد ملی کامل (Reveal)',
            'identity.view_sensitive_documents' => 'مشاهده مدارک احراز هویت',
            'identity.override_level' => 'تغییر دستی سطح تأیید حساب',
            'identity.unlock_ownership_verification' => 'رفع قفل تطبیق شماره',
            'identity_provider.view' => 'مشاهده سرویس‌های احراز هویت',
            'identity_provider.manage' => 'مدیریت سرویس‌های احراز هویت',
            'identity_provider.test' => 'تست اتصال سرویس احراز هویت',
            'sat.view' => 'مشاهده درخواست‌های سات',
            'sat.manage' => 'مدیریت درخواست‌های سات',
            'finance.view' => 'مشاهده مالی و برداشت‌ها',
            'finance.manage' => 'مدیریت مالی و برداشت‌ها',
            'finance.view_payout_card' => 'نمایش شماره کارت کامل',
            'content.view' => 'مشاهده محتوا',
            'content.manage' => 'مدیریت محتوا',
            'family.manage', 'family.posts.create', 'family.posts.publish',
            'family.comments.moderate', 'family.comments.reply', 'family.families.view',
            'family.analytics.view', 'family.pulse.manage', 'family.media.upload'
                => FamilyPermissionCatalog::label($permission),
            'sms.view' => 'مشاهده پیامک',
            'sms.manage' => 'مدیریت پیامک',
            'audit.view' => 'مشاهده لاگ ممیزی',
            'roles.view' => 'مشاهده نقش‌ها',
            'roles.manage' => 'مدیریت نقش‌ها',
            'permissions.view' => 'مشاهده دسترسی‌ها',
            'permissions.manage' => 'مدیریت دسترسی‌ها',
            'admins.view_email' => 'مشاهده ایمیل مدیران',
            'admins.create' => 'افزودن مدیر',
            'admins.assign_role' => 'تغییر نقش مدیر',
            'admins.delete' => 'حذف مدیر',
            'tickets.view' => 'مشاهده تیکت‌ها',
            'tickets.manage' => 'مدیریت تیکت‌ها',
            'orders.view' => 'مشاهده سفارش‌ها',
            'orders.manage' => 'مدیریت سفارش‌ها',
            'settings.view' => 'مشاهده تنظیمات',
            'settings.manage' => 'مدیریت تنظیمات',
            default => $permission,
        };
    }
}
