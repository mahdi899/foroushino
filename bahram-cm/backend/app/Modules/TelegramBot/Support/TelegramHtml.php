<?php

namespace App\Modules\TelegramBot\Support;

final class TelegramHtml
{
    public static function escape(string $text): string
    {
        return htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8');
    }

    public static function bold(string $text): string
    {
        return '<b>'.self::escape($text).'</b>';
    }

    public static function link(string $url, string $label): string
    {
        return '<a href="'.self::escape($url).'">'.self::escape($label).'</a>';
    }
}
