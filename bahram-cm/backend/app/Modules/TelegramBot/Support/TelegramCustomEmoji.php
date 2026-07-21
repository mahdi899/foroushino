<?php

namespace App\Modules\TelegramBot\Support;

/**
 * Telegram Premium / custom emoji helpers (Bot API 9.4+).
 *
 * IMPORTANT: only use document IDs confirmed via Telegram (message entities).
 * Invalid IDs make sendMessage fail with DOCUMENT_INVALID and break the bot.
 *
 * Until real IDs are collected from the owner's Premium stickers, we render
 * unicode fallbacks only (safe). Set ENABLED=true and fill IDS when ready.
 */
final class TelegramCustomEmoji
{
    /**
     * Master switch — keep false until custom_emoji_id values are verified.
     * Official docs example (thumbs_up) is the only known-safe ID so far.
     */
    public const ENABLED = false;

    /** Verified custom emoji sticker document IDs only. */
    public const IDS = [
        // From Telegram Bot API formatting docs:
        'thumbs_up' => '5368324170671202286',
    ];

    public const FALLBACKS = [
        'thumbs_up' => '👍',
        'rocket' => '🚀',
        'point_up' => '☝️',
        'check' => '✅',
        'cross' => '❌',
        'fire' => '🔥',
        'star' => '⭐',
        'heart' => '❤️',
        'party' => '🎉',
        'sparkles' => '✨',
        'wave' => '👋',
        'home' => '🏠',
        'graduation' => '🎓',
        'mic' => '🎤',
        'bell' => '🔔',
        'gift' => '🎁',
        'support' => '🎫',
        'user' => '👤',
        'lightning' => '⚡',
        'lock' => '🔒',
        'key' => '🔑',
        'money' => '💰',
        'calendar' => '📅',
        'pin' => '📍',
        'play' => '▶️',
        'globe' => '🌐',
        'cart' => '🛒',
        'phone' => '📱',
        'warning' => '⚠️',
        'empty' => '📭',
        'family' => '👨‍👩‍👧‍👦',
        'channel' => '📣',
        'tools' => '🛠',
        'pen' => '✍️',
    ];

    public static function tag(string $key): string
    {
        $fallback = self::FALLBACKS[$key] ?? '✨';
        if (! self::ENABLED) {
            return $fallback;
        }

        $id = self::id($key);
        if ($id === null) {
            return $fallback;
        }

        return '<tg-emoji emoji-id="'.$id.'">'.$fallback.'</tg-emoji>';
    }

    public static function id(string $key): ?string
    {
        if (! self::ENABLED) {
            return null;
        }

        return self::IDS[$key] ?? null;
    }

    /** @return array{icon_custom_emoji_id?: string} */
    public static function buttonIcon(string $key): array
    {
        $id = self::id($key);

        return $id !== null ? ['icon_custom_emoji_id' => $id] : [];
    }

    /** Strip tg-emoji tags / icon fields for safe retry after DOCUMENT_INVALID. */
    public static function stripHtmlTags(string $html): string
    {
        $html = preg_replace('/<tg-emoji\b[^>]*>/i', '', $html) ?? $html;
        $html = str_replace('</tg-emoji>', '', $html);

        return $html;
    }

    /**
     * @param  array<string, mixed>  $options
     * @return array<string, mixed>
     */
    public static function stripButtonIcons(array $options): array
    {
        $markup = $options['reply_markup'] ?? null;
        if (! is_array($markup)) {
            return $options;
        }

        foreach (['inline_keyboard', 'keyboard'] as $kind) {
            if (! isset($markup[$kind]) || ! is_array($markup[$kind])) {
                continue;
            }
            foreach ($markup[$kind] as $r => $row) {
                if (! is_array($row)) {
                    continue;
                }
                foreach ($row as $c => $btn) {
                    if (is_array($btn)) {
                        unset($markup[$kind][$r][$c]['icon_custom_emoji_id']);
                    }
                }
            }
        }

        $options['reply_markup'] = $markup;

        return $options;
    }
}
