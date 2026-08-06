<?php

namespace App\Enums\Family;

use App\Enums\Concerns\EnumValues;

/**
 * Binary family status.
 *
 * Legacy values (forming / cooling / dormant) are remapped by migration
 * `2026_08_06_140000_simplify_family_lifecycle_to_binary`:
 * - forming, cooling → active
 * - dormant → inactive
 */
enum FamilyLifecycle: string
{
    use EnumValues;

    case Active = 'active';
    case Inactive = 'inactive';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'فعال',
            self::Inactive => 'غیر فعال',
        };
    }

    public function isActive(): bool
    {
        return $this === self::Active;
    }

    public function isInactive(): bool
    {
        return $this === self::Inactive;
    }
}
