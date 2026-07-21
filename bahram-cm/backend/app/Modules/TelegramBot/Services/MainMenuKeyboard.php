<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Enums\BotFeatureFlag;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;

class MainMenuKeyboard
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

    /** @var array<string, string> action => message catalog key */
    public const ACTION_KEYS = [
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

    /** Old labels that may still sit on users' reply keyboards. */
    private const LEGACY_ALIASES = [
        self::ACTION_COURSES => ['دوره کمپین نویسی 🎓'],
        self::ACTION_ACCOUNT => ['حساب کاربری 👤'],
        self::ACTION_ADMIN => ['پنل ادمین بات 🛠'],
    ];

    public function __construct(
        private readonly BotMessageCatalog $messages,
    ) {}

    public function buttonLabel(TelegramBot $bot, string $action): string
    {
        $key = self::ACTION_KEYS[$action] ?? null;
        if ($key === null) {
            return $action;
        }

        return $this->normalizeButtonText($this->messages->get($bot, $key));
    }

    /**
     * Resolve a pressed reply-keyboard label to an action.
     * Accepts the current custom label, default label, and legacy aliases.
     */
    public function resolveAction(string $text, TelegramBot $bot): ?string
    {
        $text = trim($text);
        if ($text === '') {
            return null;
        }

        foreach (self::ACTION_KEYS as $action => $key) {
            $current = $this->normalizeButtonText($this->messages->get($bot, $key));
            $default = $this->normalizeButtonText((string) (BotMessageCatalog::DEFAULTS[$key]['body'] ?? ''));
            $legacy = self::LEGACY_ALIASES[$action] ?? [];

            if ($text === $current || ($default !== '' && $text === $default) || in_array($text, $legacy, true)) {
                return $action;
            }
        }

        return null;
    }

    /** @return list<list<string>> */
    public function rows(?TelegramAccount $account = null, ?TelegramBot $bot = null): array
    {
        if ($bot === null) {
            return $this->defaultRows($account, null);
        }

        $courses = $this->buttonLabel($bot, self::ACTION_COURSES);
        $seminars = $this->buttonLabel($bot, self::ACTION_SEMINARS);
        $sat = $this->buttonLabel($bot, self::ACTION_SAT);
        $channel = $this->buttonLabel($bot, self::ACTION_CHANNEL);
        $family = $this->buttonLabel($bot, self::ACTION_FAMILY);
        $support = $this->buttonLabel($bot, self::ACTION_SUPPORT);
        $accountBtn = $this->buttonLabel($bot, self::ACTION_ACCOUNT);

        // Primary CTA full-width, then paired rows for thumb reachability.
        $rows = [
            [$courses],
            [$seminars, $sat],
            [$channel, $family],
        ];

        if ($bot->featureEnabled(BotFeatureFlag::ReferralEnabled)) {
            $rows[] = [$this->buttonLabel($bot, self::ACTION_REFERRAL), $support];
            $rows[] = [$accountBtn];
        } else {
            $rows[] = [$support, $accountBtn];
        }

        if ($account?->isBotAdmin()) {
            $rows[] = [$this->buttonLabel($bot, self::ACTION_ADMIN)];
        }

        return $rows;
    }

    /** @return array<string, mixed> */
    public function replyMarkup(?TelegramAccount $account = null, ?TelegramBot $bot = null): array
    {
        $keyboard = [];
        foreach ($this->rows($account, $bot) as $row) {
            $keyboard[] = array_map(static fn (string $text) => ['text' => $text], $row);
        }

        return [
            'keyboard' => $keyboard,
            'resize_keyboard' => true,
            'is_persistent' => true,
        ];
    }

    /**
     * Inline shortcuts under welcome / menu hint (interactive tap without reply keyboard).
     *
     * @return array<string, mixed>
     */
    public function quickNavInlineMarkup(TelegramBot $bot): array
    {
        $rows = [
            [
                [
                    'text' => '🎓 دوره‌ها',
                    'callback_data' => 'nav:'.self::ACTION_COURSES,
                    'style' => 'primary',
                ],
                [
                    'text' => '🎤 سمینارها',
                    'callback_data' => 'nav:'.self::ACTION_SEMINARS,
                ],
            ],
            [
                [
                    'text' => '👤 حساب من',
                    'callback_data' => 'nav:'.self::ACTION_ACCOUNT,
                ],
                [
                    'text' => '🎫 پشتیبانی',
                    'callback_data' => 'nav:'.self::ACTION_SUPPORT,
                    'style' => 'success',
                ],
            ],
        ];

        if ($bot->featureEnabled(BotFeatureFlag::ReferralEnabled)) {
            $rows[] = [[
                'text' => '🎁 معرفی دوستان',
                'callback_data' => 'nav:'.self::ACTION_REFERRAL,
            ]];
        }

        return ['inline_keyboard' => $rows];
    }

    public function isMenuButton(string $text, ?TelegramAccount $account = null, ?TelegramBot $bot = null): bool
    {
        if ($bot !== null && $this->resolveAction($text, $bot) !== null) {
            return true;
        }

        foreach ($this->rows($account, $bot) as $row) {
            if (in_array($text, $row, true)) {
                return true;
            }
        }

        return false;
    }

    /** @return array<string, mixed> */
    public function remove(): array
    {
        return ['remove_keyboard' => true];
    }

    /** @return list<list<string>> */
    private function defaultRows(?TelegramAccount $account, ?TelegramBot $bot): array
    {
        $rows = [
            ['دوره‌ها 🎓'],
            ['سمینارها 🎤', 'سات ☎️'],
            ['کانال مرجع 📣', 'خانواده 👨‍👩‍👧‍👦'],
        ];

        if ($bot === null || $bot->featureEnabled(BotFeatureFlag::ReferralEnabled)) {
            $rows[] = ['معرفی دوستان 🎁', 'پشتیبانی 🎫'];
            $rows[] = ['حساب من 👤'];
        } else {
            $rows[] = ['پشتیبانی 🎫', 'حساب من 👤'];
        }

        if ($account?->isBotAdmin()) {
            $rows[] = ['پنل ادمین 🛠'];
        }

        return $rows;
    }

    private function normalizeButtonText(string $text): string
    {
        $text = str_replace(["\r\n", "\r"], "\n", trim($text));
        $firstLine = trim(explode("\n", $text, 2)[0] ?? '');

        if (mb_strlen($firstLine) > 64) {
            return mb_substr($firstLine, 0, 64);
        }

        return $firstLine !== '' ? $firstLine : '—';
    }
}
