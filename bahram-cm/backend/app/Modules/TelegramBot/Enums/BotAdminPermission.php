<?php

namespace App\Modules\TelegramBot\Enums;

enum BotAdminPermission: string
{
    case Stats = 'stats';
    case Broadcast = 'broadcast';
    case Subscriptions = 'subscriptions';
    case UserInfo = 'user_info';
    case Settings = 'settings';
    case Messages = 'messages';
    case ForcedJoin = 'forced_join';
    case Menus = 'menus';
    case Discount = 'discount';
    case DataExport = 'data_export';
    case Tickets = 'tickets';

    public function labelFa(): string
    {
        return match ($this) {
            self::Stats => 'آمار ربات',
            self::Broadcast => 'ارسال همگانی',
            self::Subscriptions => 'اشتراک ها',
            self::UserInfo => 'اطلاعات کاربر',
            self::Settings => 'تنظیمات',
            self::Messages => 'پیام ها',
            self::ForcedJoin => 'جوین اجباری',
            self::Menus => 'منو ها',
            self::Discount => 'کد تخفیف',
            self::DataExport => 'خروجی دیتا',
            self::Tickets => 'تیکت',
        };
    }

    /** @return list<self> */
    public static function ordered(): array
    {
        return [
            self::Stats,
            self::Broadcast,
            self::Subscriptions,
            self::UserInfo,
            self::Settings,
            self::Messages,
            self::ForcedJoin,
            self::Menus,
            self::Discount,
            self::DataExport,
            self::Tickets,
        ];
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(static fn (self $p) => $p->value, self::ordered());
    }
}
