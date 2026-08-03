<?php

namespace App\Enums;

enum TicketTechEscalation: string
{
    case TechSupport = 'tech_support';
    case TechManager = 'tech_manager';
    case SuperAdmin = 'super_admin';
    case Resolved = 'resolved';

    public function label(): string
    {
        return match ($this) {
            self::TechSupport => 'پشتیبان فنی',
            self::TechManager => 'مدیر فنی',
            self::SuperAdmin => 'مدیر کل',
            self::Resolved => 'حل‌شده',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
