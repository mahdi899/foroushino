<?php

namespace App\Support;

/**
 * Canonical bootstrap super-admin identity for production.
 */
final class BootstrapAdmin
{
    public const EMAIL = 'shokspy@gmail.com';

    public static function isRootEmail(?string $email): bool
    {
        return strtolower((string) $email) === self::EMAIL;
    }
}
