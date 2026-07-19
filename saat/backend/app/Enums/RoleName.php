<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum RoleName: string
{
    use EnumValues;

    case Agent = 'agent';
    case Leader = 'leader';
    case Supervisor = 'supervisor';
    case Manager = 'manager';
    case Admin = 'admin';
    case SuperAdmin = 'super-admin';

    /**
     * Roles with org-wide visibility (all teams).
     *
     * @return array<int, self>
     */
    public static function orgWideRoles(): array
    {
        return [self::Manager, self::Admin, self::SuperAdmin];
    }

    /**
     * Roles that can act on behalf of / oversee agents (non line-agent roles).
     *
     * @return array<int, self>
     */
    public static function managementRoles(): array
    {
        return [self::Leader, self::Supervisor, self::Manager, self::Admin, self::SuperAdmin];
    }

    /**
     * Roles created in the admin panel with an initial password (no Telegram OTP).
     *
     * @return list<string>
     */
    public static function passwordLoginAtCreationValues(): array
    {
        return array_map(
            static fn (self $role): string => $role->value,
            [self::Agent, self::Leader, self::Supervisor, ...self::orgWideRoles()],
        );
    }
}
