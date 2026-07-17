<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Enums\BotFeatureFlag;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;

class MainMenuKeyboard
{
    /** @return list<list<string>> */
    public function rows(?TelegramAccount $account = null, ?TelegramBot $bot = null): array
    {
        $rows = [
            ['دوره کمپین نویسی 🎓'],
            ['سمینارها 🎤', 'سات ☎️'],
            ['کانال مرجع 📣', 'خانواده 👨‍👩‍👧‍👦'],
        ];

        $utility = ['پشتیبانی 🎫', 'حساب کاربری 👤'];
        if ($bot === null || $bot->featureEnabled(BotFeatureFlag::ReferralEnabled)) {
            array_unshift($utility, 'معرفی دوستان 🎁');
        }
        $rows[] = $utility;

        if ($account?->isBotAdmin()) {
            $rows[] = ['پنل ادمین بات 🛠'];
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
        ];
    }

    public function isMenuButton(string $text, ?TelegramAccount $account = null, ?TelegramBot $bot = null): bool
    {
        foreach ($this->rows($account, $bot) as $row) {
            if (in_array($text, $row, true)) {
                return true;
            }
        }

        return $text === 'پنل ادمین بات 🛠' || $text === 'معرفی دوستان 🎁';
    }

    /** @return array<string, mixed> */
    public function remove(): array
    {
        return ['remove_keyboard' => true];
    }
}
