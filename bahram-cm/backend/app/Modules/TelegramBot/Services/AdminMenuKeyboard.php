<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Enums\BotAdminPermission;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Support\TelegramCustomEmoji;

class AdminMenuKeyboard
{
    public const USERS = 'کاربران';

    public const ADMINS = 'ادمین‌ها';

    public const STATS = 'آمار';

    public const BROADCAST = 'پیام همگانی';

    public const REQUIRED_CHATS = 'کانال اجباری';

    public const DESTINATIONS = 'مقاصد';

    public const MERGE_LINES = 'ادغام خط مقاصد';

    public const DISCOUNTS = 'کد تخفیف';

    public const TICKETS = 'تیکت‌ها';

    public const MESSAGES = 'پیام‌ها';

    public const REFERENCE_CHANNEL = 'مدیریت کانال مرجع';

    public const COURSES = 'مدیریت دوره‌ها';

    public const SEMINARS = 'مدیریت سمینارها';

    public const EXPORT = 'خروجی کاربران';

    public const PROFILE = 'پروفایل بات';

    public const SETTINGS = 'تنظیمات';

    public const LOGS = 'لاگ‌ها';

    public const EVENTS = 'رویدادها';

    public const HOME = 'داشبورد';

    public const EXIT = 'خروج از پنل ادمین';

    /** Premium icon key per button label. */
    private const ICONS = [
        self::USERS => 'user',
        self::ADMINS => 'shield',
        self::STATS => 'chart',
        self::BROADCAST => 'channel',
        self::REQUIRED_CHATS => 'tv',
        self::DESTINATIONS => 'pin',
        self::MERGE_LINES => 'pin',
        self::DISCOUNTS => 'ticket',
        self::TICKETS => 'support',
        self::MESSAGES => 'chat',
        self::REFERENCE_CHANNEL => 'channel',
        self::COURSES => 'graduation',
        self::SEMINARS => 'mic',
        self::EXPORT => 'empty',
        self::PROFILE => 'robot',
        self::SETTINGS => 'tools',
        self::LOGS => 'notes',
        self::EVENTS => 'channel',
        self::HOME => 'home',
        self::EXIT => 'cross',
    ];

    /**
     * Catalog hubs that used to share bare main-menu labels («دوره‌ها» / …).
     * Canonical labels are now «مدیریت …» so they no longer overlap; kept empty
     * for isAdminExclusiveMenuButton / deprecated catalog-hub helpers.
     *
     * @var list<string>
     */
    private const MAIN_MENU_OVERLAP = [];

    /**
     * Bare main-menu cores — only matched while AdminPanel is open (old keyboards).
     *
     * @var array<string, list<string>>
     */
    private const CATALOG_CORE_ALIASES = [
        self::REFERENCE_CHANNEL => ['کانال مرجع'],
        self::COURSES => ['دوره‌ها'],
        self::SEMINARS => ['سمینارها'],
    ];

    /** Old labels that may still sit on users' reply keyboards. */
    private const LEGACY = [
        self::USERS => ['👥 کاربران'],
        self::ADMINS => ['🛡 ادمین‌ها'],
        self::STATS => ['📊 آمار'],
        self::BROADCAST => ['📣 پیام همگانی'],
        self::REQUIRED_CHATS => ['📻 کانال اجباری'],
        self::DESTINATIONS => ['📍 مقاصد'],
        self::MERGE_LINES => ['🔗 ادغام خط مقاصد', 'ادغام خط'],
        self::DISCOUNTS => ['🎟 کد تخفیف'],
        self::TICKETS => ['🎫 تیکت‌ها'],
        self::MESSAGES => ['💬 پیام‌ها'],
        self::REFERENCE_CHANNEL => ['📡 کانال مرجع'],
        self::COURSES => ['🎓 دوره‌ها', 'دوره‌ها 🎓'],
        self::SEMINARS => ['🎤 سمینارها', 'سمینارها 🎤'],
        self::EXPORT => ['📤 خروجی کاربران'],
        self::PROFILE => ['🤖 پروفایل بات'],
        self::SETTINGS => ['⚙️ تنظیمات'],
        self::LOGS => ['📋 لاگ‌ها'],
        self::EVENTS => ['📡 رویدادها'],
        self::HOME => ['🏠 داشبورد'],
        self::EXIT => ['❌ خروج از پنل ادمین'],
    ];

    /**
     * Map each menu button to the permission that unlocks it.
     * HOME/EXIT are always available for bot admins.
     * ADMINS requires super rank (checked separately).
     *
     * @return array<string, BotAdminPermission|null>
     */
    public function buttonPermissions(): array
    {
        return [
            self::USERS => BotAdminPermission::UserInfo,
            self::ADMINS => null, // gated by canManageBotAdmins()
            self::STATS => BotAdminPermission::Stats,
            self::BROADCAST => BotAdminPermission::Broadcast,
            self::REQUIRED_CHATS => BotAdminPermission::ForcedJoin,
            self::DESTINATIONS => BotAdminPermission::Menus,
            self::MERGE_LINES => BotAdminPermission::UserInfo,
            self::DISCOUNTS => BotAdminPermission::Discount,
            self::TICKETS => BotAdminPermission::Tickets,
            self::MESSAGES => BotAdminPermission::Messages,
            self::REFERENCE_CHANNEL => BotAdminPermission::Messages,
            self::COURSES => BotAdminPermission::Messages,
            self::SEMINARS => BotAdminPermission::Messages,
            self::EXPORT => BotAdminPermission::DataExport,
            self::PROFILE => BotAdminPermission::Settings,
            self::SETTINGS => BotAdminPermission::Settings,
            self::LOGS => BotAdminPermission::Stats,
            self::EVENTS => BotAdminPermission::Events,
            self::HOME => null,
            self::EXIT => null,
        ];
    }

    /** @return list<list<string>> */
    public function rows(?TelegramAccount $account = null): array
    {
        $all = [
            [self::USERS, self::ADMINS],
            [self::STATS, self::BROADCAST],
            [self::REFERENCE_CHANNEL, self::COURSES],
            [self::SEMINARS, self::MESSAGES],
            [self::TICKETS, self::DISCOUNTS],
            [self::REQUIRED_CHATS, self::DESTINATIONS],
            [self::MERGE_LINES],
            [self::EXPORT, self::PROFILE],
            [self::SETTINGS, self::LOGS],
            [self::EVENTS, self::HOME],
            [self::EXIT],
        ];

        if ($account === null) {
            return $all;
        }

        $map = $this->buttonPermissions();
        $filtered = [];
        foreach ($all as $row) {
            $kept = [];
            foreach ($row as $label) {
                if ($label === self::ADMINS) {
                    if ($account->canManageBotAdmins()) {
                        $kept[] = $label;
                    }

                    continue;
                }

                $permission = $map[$label] ?? null;
                if ($permission === null || $account->hasBotAdminPermission($permission)) {
                    $kept[] = $label;
                }
            }
            if ($kept !== []) {
                $filtered[] = $kept;
            }
        }

        return $filtered;
    }

    /** @return array<string, mixed> */
    public function replyMarkup(?TelegramAccount $account = null): array
    {
        $keyboard = [];
        foreach ($this->rows($account) as $row) {
            $keyboard[] = array_map(static function (string $text): array {
                $iconKey = self::ICONS[$text] ?? null;
                if ($iconKey === null) {
                    return ['text' => $text];
                }

                // Premium icon only — no unicode twin in text (avoids 🎓🎓 double emoji).
                return [
                    'text' => TelegramCustomEmoji::buttonText($text, $iconKey),
                    ...TelegramCustomEmoji::buttonIcon($iconKey),
                ];
            }, $row);
        }

        return [
            'keyboard' => $keyboard,
            'resize_keyboard' => true,
        ];
    }

    public function isMenuButton(string $text, ?TelegramAccount $account = null): bool
    {
        return $this->normalizeLabel($text, $account) !== null;
    }

    /** Match admin reply keyboard while inside admin panel (emoji-stripped labels OK). */
    public function isAdminPanelMenuButton(string $text, ?TelegramAccount $account = null): bool
    {
        if ($account !== null && ! $account->isBotAdmin()) {
            return false;
        }

        return $this->normalizeAdminPanelLabel($text, $account) !== null;
    }

    /**
     * Admin-only buttons (not on public main menu) — safe to open admin panel from Idle
     * when the foreign host keyboard is ahead of Iran conversation state.
     */
    public function isAdminExclusiveMenuButton(string $text, ?TelegramAccount $account = null): bool
    {
        $label = $this->normalizeAdminPanelLabel($text, $account);
        if ($label === null || $label === self::EXIT) {
            return false;
        }

        return ! $this->overlapsMainMenu($label);
    }

    /** @deprecated Use isAdminPanelMenuButton() */
    public function isCatalogHubButton(string $text, ?TelegramAccount $account = null): bool
    {
        if ($account !== null && ! $account->isBotAdmin()) {
            return false;
        }

        $label = $this->normalizeAdminPanelLabel($text, $account);

        return $label !== null && in_array($label, self::MAIN_MENU_OVERLAP, true);
    }

    /** @deprecated Use isAdminPanelMenuButton() */
    public function isAdminPanelButton(string $text, ?TelegramAccount $account = null): bool
    {
        return $this->isAdminPanelMenuButton($text, $account);
    }

    /** Map pressed text (current or legacy) to canonical label — no main-menu overlap while Idle. */
    public function normalizeLabel(string $text, ?TelegramAccount $account = null): ?string
    {
        return $this->normalizeTapMatch($text, includeCoreAliases: false);
    }

    /** Full admin keyboard match — use only when conversation is AdminPanel / AdminWaitingInput. */
    public function normalizeAdminPanelLabel(string $text, ?TelegramAccount $account = null): ?string
    {
        if ($account !== null && ! $account->isBotAdmin()) {
            return null;
        }

        return $this->normalizeTapMatch($text, includeCoreAliases: true);
    }

    private function normalizeTapMatch(string $text, bool $includeCoreAliases): ?string
    {
        $text = $this->normalizeTapText($text);
        if ($text === '') {
            return null;
        }

        if (array_key_exists($text, $this->buttonPermissions())) {
            return $text;
        }

        foreach (self::LEGACY as $canonical => $aliases) {
            foreach ($aliases as $alias) {
                if ($text === $this->normalizeTapText($alias)) {
                    return $canonical;
                }
            }
        }

        if (! $includeCoreAliases) {
            return null;
        }

        $coreMatch = $this->normalizeAdminCoreLabel($text);
        if ($coreMatch !== null) {
            return $coreMatch;
        }

        return $this->normalizeCatalogCoreLabel($text);
    }

    private function overlapsMainMenu(string $canonical): bool
    {
        return in_array($canonical, self::MAIN_MENU_OVERLAP, true);
    }

    private function normalizeAdminCoreLabel(string $text): ?string
    {
        $core = $this->coreLabel($text);
        if ($core === '') {
            return null;
        }

        foreach (array_keys($this->buttonPermissions()) as $canonical) {
            if ($core === $this->coreLabel($canonical)) {
                return $canonical;
            }
        }

        foreach (self::LEGACY as $canonical => $aliases) {
            foreach ($aliases as $alias) {
                if ($core === $this->coreLabel($alias)) {
                    return $canonical;
                }
            }
        }

        return null;
    }

    private function normalizeTapText(string $text): string
    {
        $text = strip_tags($text);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = str_replace(["\u{200c}", "\u{feff}", 'ي', 'ك'], ['', '', 'ی', 'ک'], $text);
        $text = preg_replace('/\s+/u', ' ', trim($text)) ?? trim($text);
        $text = TelegramCustomEmoji::stripLeadingFallback($text);

        return trim($text);
    }

    private function normalizeCatalogCoreLabel(string $text): ?string
    {
        $core = $this->coreLabel($text);
        if ($core === '') {
            return null;
        }

        foreach (self::CATALOG_CORE_ALIASES as $canonical => $aliases) {
            foreach ($aliases as $alias) {
                if ($core === $this->coreLabel($alias)) {
                    return $canonical;
                }
            }
        }

        return null;
    }

    /** Compare menu taps by Persian label only (emoji / VS16 ignored). */
    private function coreLabel(string $text): string
    {
        $core = preg_replace('/[\x{FE0F}\x{200D}\p{So}\p{Sk}]+/u', '', $text) ?? $text;
        $core = preg_replace('/\s+/u', ' ', trim($core)) ?? trim($core);

        return $core;
    }

    /**
     * Inline button with optional premium icon.
     *
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    public static function inlineButton(string $text, string $callbackData, ?string $iconKey = null, array $extra = []): array
    {
        $button = ['text' => $text, 'callback_data' => $callbackData, ...$extra];
        if ($iconKey !== null) {
            $button = [...$button, ...TelegramCustomEmoji::buttonIcon($iconKey)];
        }

        return $button;
    }
}
