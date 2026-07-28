<?php

namespace App\Modules\TelegramBot\Support;

/**
 * Telegram Premium / custom emoji helpers (Bot API 9.4+).
 *
 * IDs below come from Telegram itself via getForumTopicIconStickers /
 * getCustomEmojiStickers (verified with a live sendMessage smoke test).
 * Never invent custom_emoji_id values — invalid IDs break the bot.
 */
final class TelegramCustomEmoji
{
    public const ENABLED = true;

    /**
     * Verified custom emoji sticker document IDs only.
     * Keys without an entry keep the unicode fallback.
     */
    public const IDS = [
        'thumbs_up' => '5368324170671202286', // 👍
        'check' => '5237699328843200968', // ✅
        'cross' => '5377498341074542641', // ‼️
        'fire' => '5312241539987020022', // 🔥
        'star' => '5235579393115438657', // ⭐️
        'heart' => '5312138559556164615', // ❤️
        'party' => '5310228579009699834', // 🎉
        'sparkles' => '5312536423851630001', // 💡
        'home' => '5312486108309757006', // 🏠
        'graduation' => '5357419403325481346', // 🎓
        'mic' => '5382003830487523366', // 🎤
        'bell' => '5309984423003823246', // 📣
        'gift' => '5309958691854754293', // 💎
        'support' => '5377624166436445368', // 🎟
        'lightning' => '5312016608254762256', // ⚡️
        'key' => '5418115271267197333', // 🪪
        'money' => '5350452584119279096', // 💰
        'calendar' => '5433614043006903194', // 📆
        'point_up' => '5418085807791545980', // 🔝
        'rocket' => '5348436127038579546', // ✈️
        'cart' => '5431492767249342908', // 🛒
        'phone' => '5409357944619802453', // 📱
        'warning' => '5379748062124056162', // ❗️
        'family' => '5386435923204382258', // 👨‍👩‍👧‍👦
        'channel' => '5309984423003823246', // 📣
        'pen' => '5238156910363950406', // ✍️
        'play' => '5368653135101310687', // 🎬
        'tools' => '5350554349074391003', // 💻
        'user' => '5357121491508928442', // 👀
        'pin' => '5309965701241379366', // 🔎
        'empty' => '5357315181649076022', // 📁
        'globe' => '5348436127038579546', // ✈️
        'wave' => '5310228579009699834', // 🎉
        'lock' => '5418115271267197333', // 🪪
        // Admin panel
        'robot' => '5309832892262654231', // 🤖
        'chart' => '5350305691942788490', // 📈
        'chat' => '5417915203100613993', // 💬
        'shield' => '5357188789351490453', // 🪖
        'notes' => '5373251851074415873', // 📝
        'tv' => '5350513667144163474', // 📺
        'ticket' => '5377624166436445368', // 🎟
        'add' => '5237699328843200968', // ✅
        'back' => '5418085807791545980', // 🔝
        // Account / referral profile
        'cash' => '5309929258443874898', // 💸
        'coin' => '5377690785674175481', // 🪙
        'trophy' => '5312315739842026755', // 🏆
        'briefcase' => '5348227245599105972', // 💼
        'diamond' => '5309958691854754293', // 💎
    ];

    public const FALLBACKS = [
        'thumbs_up' => '👍',
        'rocket' => '✈️',
        'point_up' => '🔝',
        'check' => '✅',
        'cross' => '‼️',
        'fire' => '🔥',
        'star' => '⭐️',
        'heart' => '❤️',
        'party' => '🎉',
        'sparkles' => '💡',
        'wave' => '🎉',
        'home' => '🏠',
        'graduation' => '🎓',
        'mic' => '🎤',
        'bell' => '📣',
        'gift' => '💎',
        'support' => '🎟',
        'user' => '👀',
        'lightning' => '⚡️',
        'lock' => '🪪',
        'key' => '🪪',
        'money' => '💰',
        'calendar' => '📆',
        'pin' => '🔎',
        'play' => '🎬',
        'globe' => '✈️',
        'cart' => '🛒',
        'phone' => '📱',
        'warning' => '❗️',
        'empty' => '📁',
        'family' => '👨‍👩‍👧‍👦',
        'channel' => '📣',
        'tools' => '💻',
        'pen' => '✍️',
        'robot' => '🤖',
        'chart' => '📈',
        'chat' => '💬',
        'shield' => '🪖',
        'notes' => '📝',
        'tv' => '📺',
        'ticket' => '🎟',
        'add' => '✅',
        'back' => '🔝',
        'cash' => '💸',
        'coin' => '🪙',
        'trophy' => '🏆',
        'briefcase' => '💼',
        'diamond' => '💎',
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

        $id = self::IDS[$key] ?? null;

        return $id !== null ? (string) $id : null;
    }

    public static function fallback(string $key): string
    {
        return self::FALLBACKS[$key] ?? '✨';
    }

    /** @return array{icon_custom_emoji_id?: string} */
    public static function buttonIcon(string $key): array
    {
        $id = self::id($key);

        return $id !== null ? ['icon_custom_emoji_id' => $id] : [];
    }

    public static function buttonText(string $label, string $iconKey): string
    {
        $label = trim($label);
        $fallback = self::fallback($iconKey);
        if ($fallback === '' || $label === '') {
            return $label !== '' ? $label : $fallback;
        }
        if (str_starts_with($label, $fallback) || str_contains($label, $fallback)) {
            return $label;
        }

        return $fallback.' '.$label;
    }

    /** Strip a leading menu unicode fallback so «🎓 دوره‌ها» still resolves to courses. */
    public static function stripLeadingFallback(string $text): string
    {
        $text = trim($text);
        if ($text === '') {
            return '';
        }

        $fallbacks = array_values(self::FALLBACKS);
        usort($fallbacks, static fn (string $a, string $b): int => mb_strlen($b) <=> mb_strlen($a));
        foreach ($fallbacks as $fallback) {
            if ($fallback !== '' && str_starts_with($text, $fallback)) {
                return trim(mb_substr($text, mb_strlen($fallback)));
            }
        }

        return $text;
    }

    /** Strip tg-emoji tags / icon fields for safe retry after DOCUMENT_INVALID. */
    public static function stripHtmlTags(string $html): string
    {
        $html = preg_replace('/<tg-emoji\b[^>]*>/i', '', $html) ?? $html;
        $html = str_replace('</tg-emoji>', '', $html);

        return $html;
    }

    public static function sanitizeHtmlKeepCustomEmoji(string $html): string
    {
        $allowed = 'tg-emoji|b|strong|i|em|u|s|code|pre|a';

        return preg_replace('/<\/?(?!'.$allowed.')\w+(?:\s[^>]*)?>/i', '', $html) ?? $html;
    }

    public static function isCustomEmojiFailure(string $message): bool
    {
        $message = strtolower($message);

        return str_contains($message, 'document_invalid')
            || str_contains($message, 'custom emoji')
            || str_contains($message, 'icon_custom_emoji')
            || str_contains($message, 'button_icon_invalid')
            || str_contains($message, 'sticker_invalid');
    }

    /**
     * @param  array<string, mixed>  $options
     * @return array<string, mixed>
     */
    public static function stripButtonIcons(array $options): array
    {
        return self::transformButtonIcons($options, prefixFallback: false);
    }

    /**
     * @param  array<string, mixed>  $options
     * @return array<string, mixed>
     */
    public static function degradeButtonIcons(array $options): array
    {
        return self::transformButtonIcons($options, prefixFallback: true);
    }

    /**
     * @param  array<string, mixed>  $options
     * @return array<string, mixed>
     */
    private static function transformButtonIcons(array $options, bool $prefixFallback): array
    {
        $markup = $options['reply_markup'] ?? null;
        if (! is_array($markup)) {
            return $options;
        }

        $idToFallback = array_flip(self::IDS);

        foreach (['inline_keyboard', 'keyboard'] as $kind) {
            if (! isset($markup[$kind]) || ! is_array($markup[$kind])) {
                continue;
            }
            foreach ($markup[$kind] as $r => $row) {
                if (! is_array($row)) {
                    continue;
                }
                foreach ($row as $c => $btn) {
                    if (! is_array($btn) || ! isset($btn['icon_custom_emoji_id'])) {
                        continue;
                    }
                    $id = (string) $btn['icon_custom_emoji_id'];
                    unset($markup[$kind][$r][$c]['icon_custom_emoji_id']);
                    if (! $prefixFallback) {
                        continue;
                    }
                    $key = $idToFallback[$id] ?? null;
                    $fallback = $key !== null ? (self::FALLBACKS[$key] ?? '') : '';
                    if ($fallback === '') {
                        continue;
                    }
                    $text = trim((string) ($btn['text'] ?? ''));
                    if ($text === '' || str_starts_with($text, $fallback) || str_contains($text, $fallback)) {
                        continue;
                    }
                    $markup[$kind][$r][$c]['text'] = $fallback.' '.$text;
                }
            }
        }

        $options['reply_markup'] = $markup;

        return $options;
    }
}
