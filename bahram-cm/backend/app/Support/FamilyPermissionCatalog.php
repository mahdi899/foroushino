<?php

namespace App\Support;

/**
 * Canonical Family manager permission names (guard: web).
 */
final class FamilyPermissionCatalog
{
    public const GUARD = 'web';

    /** @return array<string, list<string>> */
    public static function groups(): array
    {
        return [
            'Family' => [
                'family.manage',
                'family.posts.create',
                'family.posts.publish',
                'family.comments.moderate',
                'family.comments.reply',
                'family.families.view',
                'family.analytics.view',
                'family.pulse.manage',
                'family.media.upload',
                'family.settings.manage',
                'family.stories.manage',
            ],
        ];
    }

    /** @return list<string> */
    public static function all(): array
    {
        return array_values(array_unique(array_merge(...array_values(self::groups()))));
    }

    public static function label(string $permission): string
    {
        return match ($permission) {
            'family.manage' => 'مدیریت خانواده',
            'family.posts.create' => 'ایجاد پست خانواده',
            'family.posts.publish' => 'انتشار پست خانواده',
            'family.comments.moderate' => 'مدیریت نظرات خانواده',
            'family.comments.reply' => 'پاسخ بهرام به نظرات',
            'family.families.view' => 'مشاهده لیست خانواده‌ها',
            'family.analytics.view' => 'مشاهده تحلیل خانواده',
            'family.pulse.manage' => 'مدیریت Family Pulse',
            'family.media.upload' => 'آپلود رسانه خانواده',
            'family.settings.manage' => 'تنظیمات برندینگ خانواده',
            'family.stories.manage' => 'مدیریت استوری خانواده',
            default => $permission,
        };
    }
}
