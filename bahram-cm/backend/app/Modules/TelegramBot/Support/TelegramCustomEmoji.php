<?php

namespace App\Modules\TelegramBot\Support;

/**
 * Telegram Premium / custom emoji (Bot API 9.4+).
 * Requires bot owner Telegram Premium (or Fragment username).
 */
final class TelegramCustomEmoji
{
    public const IDS = [
        'thumbs_up' => '5368324170671202286',
        'rocket' => '5389102131527556772',
        'point_up' => '5301096984617166561',
        'check' => '5445284980978621387',
        'cross' => '5215276645589954516',
        'fire' => '5260293400857513443',
        'star' => '5210952531676504517',
        'heart' => '5237699328843200968',
        'party' => '5438496461262304334',
        'sparkles' => '5472164875883040077',
        'wave' => '5199741245209677759',
        'home' => '5411225014148014586',
        'graduation' => '5357418963703568727',
        'mic' => '5379748062124056162',
        'bell' => '5416081784641168838',
        'gift' => '5456140674028019486',
        'support' => '5372981976804366042',
        'user' => '5377311704590649086',
        'lightning' => '5427310180594086045',
        'lock' => '5357121548923705918',
        'key' => '5312383555636397076',
        'money' => '5373098004840448312',
        'calendar' => '5309984423003822894',
        'pin' => '5440660757194748249',
        'play' => '5231200819986047257',
        'globe' => '5309777265299296526',
        'cart' => '5350452594168227476',
        'phone' => '5377311704590649088',
        'warning' => '5447183453043888814',
        'empty' => '5231200819986047258',
        'family' => '5312383555636397078',
        'channel' => '5416081784641168840',
        'tools' => '5357418963703568729',
        'pen' => '5379748062124056164',
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

    /** HTML tag for parse_mode=HTML. */
    public static function tag(string $key): string
    {
        $fallback = self::FALLBACKS[$key] ?? '✨';
        $id = self::IDS[$key] ?? null;
        if ($id === null) {
            return $fallback;
        }

        return '<tg-emoji emoji-id="'.$id.'">'.$fallback.'</tg-emoji>';
    }

    public static function id(string $key): ?string
    {
        return self::IDS[$key] ?? null;
    }

    /** Fields to merge into KeyboardButton / InlineKeyboardButton. */
    public static function buttonIcon(string $key): array
    {
        $id = self::id($key);

        return $id !== null ? ['icon_custom_emoji_id' => $id] : [];
    }
}
