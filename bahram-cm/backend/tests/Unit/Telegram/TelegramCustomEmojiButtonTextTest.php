<?php

namespace Tests\Unit\Telegram;

use App\Modules\TelegramBot\Support\TelegramCustomEmoji;
use Tests\TestCase;

class TelegramCustomEmojiButtonTextTest extends TestCase
{
    public function test_button_text_omits_unicode_when_premium_icon_exists(): void
    {
        $text = TelegramCustomEmoji::buttonText('دوره‌ها', 'graduation');

        $this->assertSame('دوره‌ها', $text);
        $this->assertStringNotContainsString('🎓', $text);
        $this->assertArrayHasKey('icon_custom_emoji_id', TelegramCustomEmoji::buttonIcon('graduation'));
    }

    public function test_button_text_strips_trailing_unicode_when_premium_icon_exists(): void
    {
        $text = TelegramCustomEmoji::buttonText('کانال مرجع 📢', 'channel');

        $this->assertSame('کانال مرجع', $text);
    }

    public function test_degrade_reintroduces_unicode_fallback(): void
    {
        $options = [
            'reply_markup' => [
                'keyboard' => [[
                    [
                        'text' => 'دوره‌ها',
                        'icon_custom_emoji_id' => TelegramCustomEmoji::id('graduation'),
                    ],
                ]],
            ],
        ];

        $degraded = TelegramCustomEmoji::degradeButtonIcons($options);
        $btn = $degraded['reply_markup']['keyboard'][0][0];

        $this->assertArrayNotHasKey('icon_custom_emoji_id', $btn);
        $this->assertStringContainsString('🎓', $btn['text']);
        $this->assertStringContainsString('دوره‌ها', $btn['text']);
    }
}
