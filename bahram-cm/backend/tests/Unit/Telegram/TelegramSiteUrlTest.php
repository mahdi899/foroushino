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
}
