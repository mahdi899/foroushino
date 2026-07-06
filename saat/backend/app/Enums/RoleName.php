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

    /**
     * Roles that can act on behalf of / oversee agents (non line-agent roles).
     *
     * @return array<int, self>
     */
    public static function managementRoles(): array
    {
        return [self::Leader, self::Supervisor, self::Manager, self::Admin];
    }
}
