<?php

declare(strict_types=1);

namespace TelegramHost\Services;

use TelegramHost\Account\AccountCache;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Support\TelegramCustomEmoji;

final class MainMenu
{
    public const ACTION_COURSES = 'courses';
    public const ACTION_SEMINARS = 'seminars';
    public const ACTION_SAT = 'sat';
    public const ACTION_CHANNEL = 'channel';
    public const ACTION_FAMILY = 'family';
    public const ACTION_REFERRAL = 'referral';
    public const ACTION_SUPPORT = 'support';
    public const ACTION_ACCOUNT = 'account';
    public const ACTION_ADMIN = 'admin';

    /** @var array<string, string> */
    private const ACTION_KEYS = [
        self::ACTION_COURSES => 'menu_btn_courses',
        self::ACTION_SEMINARS => 'menu_btn_seminars',
        self::ACTION_SAT => 'menu_btn_sat',
        self::ACTION_CHANNEL => 'menu_btn_channel',
        self::ACTION_FAMILY => 'menu_btn_family',
        self::ACTION_REFERRAL => 'menu_btn_referral',
        self::ACTION_SUPPORT => 'menu_btn_support',
        self::ACTION_ACCOUNT => 'menu_btn_account',
        self::ACTION_ADMIN => 'menu_btn_admin',
    ];

    /** @var array<string, string> */
    private const ACTION_ICONS = [
        self::ACTION_COURSES => 'graduation',
        self::ACTION_SEMINARS => 'mic',
        self::ACTION_SAT => 'bell',
        self::ACTION_CHANNEL => 'channel',
        self::ACTION_FAMILY => 'family',
        self::ACTION_REFERRAL => 'gift',
        self::ACTION_SUPPORT => 'support',
        self::ACTION_ACCOUNT => 'user',
        self::ACTION_ADMIN => 'tools',
    ];

    /** @var array<string, list<string>> */
    private const LEGACY_ALIASES = [
        self::ACTION_COURSES => ['دوره‌ها 🎓', 'دوره کمپین نویسی 🎓', 'دوره‌ها'],
        self::ACTION_SEMINARS => ['سمینارها 🎤', 'سمینارها'],
        self::ACTION_SAT => ['سات ☎️', 'سات'],
        self::ACTION_CHANNEL => ['کانال مرجع 📣', 'کانال مرجع'],
        self::ACTION_FAMILY => ['خانواده 👨‍👩‍👧‍👦', 'خانواده'],
        self::ACTION_REFERRAL => ['معرفی دوستان 🎁', 'معرفی دوستان'],
        self::ACTION_SUPPORT => ['پشتیبانی 🎫', 'پشتیبانی'],
        self::ACTION_ACCOUNT => ['حساب من 👤', 'حساب کاربری 👤', 'حساب من', 'حساب کاربری'],
        self::ACTION_ADMIN => ['پنل ادمین 🛠', 'پنل ادمین بات 🛠', 'پنل ادمین', 'پنل ادمین بات'],
    ];

    public function __construct(
        private readonly SyncCache $cache,
        private readonly AccountCache $accounts,
    ) {}

    public function resolveAction(string $text): ?string
    {
        $text = trim($text);
        if ($text === '') {
            return null;
        }

        foreach (self::ACTION_KEYS as $action => $key) {
            $label = $this->cache->message($key, $action);
            $legacy = self::LEGACY_ALIASES[$action] ?? [];
            if ($text === $label || in_array($text, $legacy, true)) {
                return $action;
            }
        }

        return null;
    }

    public function isMenuButton(string $text): bool
    {
        return $this->resolveAction($text) !== null;
    }

    /** @return array<string, mixed> */
    public function replyMarkup(int $telegramUserId): array
    {
        $rows = [
            [self::ACTION_COURSES, self::ACTION_SEMINARS, self::ACTION_SAT],
            [self::ACTION_CHANNEL, self::ACTION_FAMILY, self::ACTION_SUPPORT],
        ];

        $lastRow = [self::ACTION_ACCOUNT];
        if ($this->cache->featureEnabled('referral_enabled')) {
            array_unshift($lastRow, self::ACTION_REFERRAL);
        }
        $rows[] = $lastRow;

        if ($this->accounts->isBotAdmin($telegramUserId)) {
            $rows[] = [self::ACTION_ADMIN];
        }

        $keyboard = [];
        foreach ($rows as $row) {
            $keyboard[] = array_map(fn (string $action) => $this->menuButton($action), $row);
        }

        return [
            'keyboard' => $keyboard,
            'resize_keyboard' => true,
        ];
    }

    /** @return array{text: string, icon_custom_emoji_id?: string} */
    private function menuButton(string $action): array
    {
        $key = self::ACTION_KEYS[$action] ?? $action;
        $iconKey = self::ACTION_ICONS[$action] ?? null;

        return [
            'text' => $this->cache->message($key, $action),
            ...($iconKey !== null ? TelegramCustomEmoji::buttonIcon($iconKey) : []),
        ];
    }
}
