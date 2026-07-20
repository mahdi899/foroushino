<?php

namespace Tests\Unit\Telegram;

use App\Modules\TelegramBot\Support\TelegramSiteUrl;
use PHPUnit\Framework\TestCase;

class TelegramSiteUrlTest extends TestCase
{
    public function test_rejects_localhost_for_inline_buttons(): void
    {
        $this->assertFalse(TelegramSiteUrl::isInlineButtonUrl('http://localhost:3000/course/foo'));
        $this->assertFalse(TelegramSiteUrl::isInlineButtonUrl('https://localhost/course/foo'));
    }

    public function test_accepts_public_https_urls(): void
    {
        $this->assertTrue(TelegramSiteUrl::isInlineButtonUrl('https://fashio.ir/course/foo'));
    }

    public function test_accepts_public_http_urls(): void
    {
        $this->assertTrue(TelegramSiteUrl::isInlineButtonUrl('http://example.com/page'));
    }

    public function test_link_markup_adds_url_button_row(): void
    {
        $options = TelegramSiteUrl::linkMarkup('https://example.com/x', 'باز کردن');

        $this->assertSame('باز کردن', $options['reply_markup']['inline_keyboard'][0][0]['text']);
        $this->assertSame('https://example.com/x', $options['reply_markup']['inline_keyboard'][0][0]['url']);
    }

    public function test_link_markup_merges_extra_rows(): void
    {
        $options = TelegramSiteUrl::linkMarkup('https://example.com/x', 'باز کردن', [
            [['text' => 'دریافت لینک ورود', 'callback_data' => 'account:login_token']],
        ]);

        $this->assertSame('باز کردن', $options['reply_markup']['inline_keyboard'][0][0]['text']);
        $this->assertSame('account:login_token', $options['reply_markup']['inline_keyboard'][1][0]['callback_data']);
    }

    public function test_link_markup_supports_button_style(): void
    {
        $options = TelegramSiteUrl::linkMarkup('https://example.com/pay', '💳 پرداخت آنلاین', [], 'success');

        $this->assertSame('success', $options['reply_markup']['inline_keyboard'][0][0]['style']);
    }

    public function test_inline_button_supports_style(): void
    {
        $button = TelegramSiteUrl::inlineButton('💳 پرداخت', 'https://example.com/pay', 'success');

        $this->assertSame('success', $button['style'] ?? null);
    }
}
