<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Enums\BotFeatureFlag;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Support\TelegramCustomEmoji;

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

    /** Premium icon key per action (icon_custom_emoji_id on reply keyboard). */
    public const ACTION_ICONS = [
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

    /** Old labels that may still sit on users' reply keyboards. */
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

    public function resolveAction(string $text, TelegramBot $bot): ?string
    {
        $text = trim($text);
        if ($text === '') {
            return null;
        }

        foreach (self::ACTION_KEYS as $action => $key) {
            $current = $this->normalizeButtonText($this->messages->get($bot, $key));
            $default = $this->normalizeButtonText((string) (BotMessageCatalog::defaults()[$key]['body'] ?? ''));
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

        // Prefer 3-across rows for denser, less repetitive layout.
        $rows = [
            [$courses, $seminars, $sat],
            [$channel, $family, $support],
        ];

        if ($bot->featureEnabled(BotFeatureFlag::ReferralEnabled)) {
            $rows[] = [$this->buttonLabel($bot, self::ACTION_REFERRAL), $accountBtn];
        } else {
            $rows[] = [$accountBtn];
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
        $actionsByLabel = [];
        if ($bot !== null) {
            foreach (self::ACTION_KEYS as $action => $_) {
                $actionsByLabel[$this->buttonLabel($bot, $action)] = $action;
            }
        }

        foreach ($this->rows($account, $bot) as $row) {
            $keyboard[] = array_map(function (string $text) use ($actionsByLabel) {
                $button = ['text' => $text];
                $action = $actionsByLabel[$text] ?? null;
                $iconKey = $action !== null ? (self::ACTION_ICONS[$action] ?? null) : null;
                if ($iconKey !== null) {
                    $button = [...$button, ...TelegramCustomEmoji::buttonIcon($iconKey)];
                }

                return $button;
            }, $row);
        }

        return [
            'keyboard' => $keyboard,
            'resize_keyboard' => true,
        ];
    }

    /** @return array<string, mixed> */
    public function quickNavInlineMarkup(TelegramBot $bot): array
    {
        $rows = [
            [
                [
                    'text' => 'دوره‌ها',
                    'callback_data' => 'nav:'.self::ACTION_COURSES,
                    'style' => 'primary',
                    ...TelegramCustomEmoji::buttonIcon('graduation'),
                ],
                [
                    'text' => 'سمینارها',
                    'callback_data' => 'nav:'.self::ACTION_SEMINARS,
                    ...TelegramCustomEmoji::buttonIcon('mic'),
                ],
            ],
            [
                [
                    'text' => 'حساب من',
                    'callback_data' => 'nav:'.self::ACTION_ACCOUNT,
                    ...TelegramCustomEmoji::buttonIcon('user'),
                ],
                [
                    'text' => 'پشتیبانی',
                    'callback_data' => 'nav:'.self::ACTION_SUPPORT,
                    'style' => 'success',
                    ...TelegramCustomEmoji::buttonIcon('support'),
                ],
            ],
        ];

        if ($bot->featureEnabled(BotFeatureFlag::ReferralEnabled)) {
            $rows[] = [[
                'text' => 'معرفی دوستان',
                'callback_data' => 'nav:'.self::ACTION_REFERRAL,
                ...TelegramCustomEmoji::buttonIcon('gift'),
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
            ['دوره‌ها', 'سمینارها', 'سات'],
            ['کانال مرجع', 'خانواده', 'پشتیبانی'],
        ];

        if ($bot === null || $bot->featureEnabled(BotFeatureFlag::ReferralEnabled)) {
            $rows[] = ['معرفی دوستان', 'حساب من'];
        } else {
            $rows[] = ['حساب من'];
        }

        if ($account?->isBotAdmin()) {
            $rows[] = ['پنل ادمین'];
        }

        return $rows;
    }

    private function normalizeButtonText(string $text): string
    {
        $text = strip_tags($text);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = str_replace(["\r\n", "\r"], "\n", trim($text));
        $firstLine = trim(explode("\n", $text, 2)[0] ?? '');

        if (mb_strlen($firstLine) > 64) {
            return mb_substr($firstLine, 0, 64);
        }

        return $firstLine !== '' ? $firstLine : '—';
    }
}
