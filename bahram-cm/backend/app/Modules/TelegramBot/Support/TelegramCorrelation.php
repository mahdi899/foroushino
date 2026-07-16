<?php

namespace App\Modules\TelegramBot\Support;

use Illuminate\Support\Str;

/**
 * Generates correlation ids used to trace a single Telegram API call (or a
 * webhook → job → outgoing-call chain) across log lines, without ever
 * exposing the bot token.
 */
final class TelegramCorrelation
{
    private const PREFIX = 'tg';

    public static function generate(): string
    {
        return self::PREFIX.'_'.Str::lower(Str::ulid()->toBase32());
    }

    public static function header(): string
    {
        return 'X-Correlation-Id';
    }
}
