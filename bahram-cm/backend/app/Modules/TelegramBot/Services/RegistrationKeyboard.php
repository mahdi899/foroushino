<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Support\TelegramCustomEmoji;

class RegistrationKeyboard
{
    public const BACK_LABEL = 'بازگشت';

    public const CONTACT_LABEL = 'ارسال شماره تماس';

    public const SHARE_CONTACT_CALLBACK = 'reg:share_contact';

    /** @return array<string, mixed> */
    public function requestContactMarkup(bool $withBack = false): array
    {
        $rows = [[
            [
                'text' => self::CONTACT_LABEL,
                'request_contact' => true,
                ...TelegramCustomEmoji::buttonIcon('phone'),
            ],
        ]];

        if ($withBack) {
            $rows[] = [[
                'text' => self::BACK_LABEL,
                ...TelegramCustomEmoji::buttonIcon('back'),
            ]];
        }

        return [
            'keyboard' => $rows,
            'resize_keyboard' => true,
            'one_time_keyboard' => ! $withBack,
        ];
    }

    /** Inline duplicate of the contact button — attached under the same message after send. */
    /** @return array<string, mixed> */
    public function requestContactInlineMarkup(): array
    {
        return [
            'inline_keyboard' => [[
                [
                    'text' => TelegramCustomEmoji::buttonText(self::CONTACT_LABEL, 'phone'),
                    'callback_data' => self::SHARE_CONTACT_CALLBACK,
                    'style' => 'primary',
                    ...TelegramCustomEmoji::buttonIcon('phone'),
                ],
            ]],
        ];
    }

    /**
     * Reply keyboard (bottom menu) + inline keyboard (under message).
     * SendTelegramMessageJob applies inline_markup via editMessageReplyMarkup.
     *
     * @return array<string, mixed>
     */
    public function phoneStepOptions(bool $withBack = false): array
    {
        return [
            'reply_markup' => $this->requestContactMarkup($withBack),
            'inline_markup' => $this->requestContactInlineMarkup(),
        ];
    }

    /** @return array<string, mixed> */
    public function nameStepMarkup(): array
    {
        return [
            'keyboard' => [[
                [
                    'text' => self::BACK_LABEL,
                    ...TelegramCustomEmoji::buttonIcon('back'),
                ],
            ]],
            'resize_keyboard' => true,
            'one_time_keyboard' => true,
        ];
    }

    public function isBackLabel(string $text): bool
    {
        $normalized = trim($text);

        return $normalized === self::BACK_LABEL
            || $normalized === '↩️ بازگشت'
            || $normalized === '🔙 بازگشت'
            || $normalized === '/back';
    }

    public function isContactLabel(string $text): bool
    {
        $normalized = trim($text);

        return $normalized === self::CONTACT_LABEL
            || $normalized === '📱 ارسال شماره تماس';
    }
}
