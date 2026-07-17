<?php

namespace Tests\Unit\Telegram;

use App\Modules\TelegramBot\Support\TelegramChatIdResolver;
use PHPUnit\Framework\TestCase;

class TelegramChatIdResolverTest extends TestCase
{
    public function test_resolves_public_invite_link_when_chat_id_is_invalid(): void
    {
        $resolved = TelegramChatIdResolver::resolve('12', 'https://t.me/rostami_cm');

        $this->assertSame('@rostami_cm', $resolved);
    }

    public function test_keeps_valid_numeric_supergroup_id(): void
    {
        $resolved = TelegramChatIdResolver::resolve('-1001234567890', 'https://t.me/example');

        $this->assertSame('-1001234567890', $resolved);
    }

    public function test_normalizes_bare_username(): void
    {
        $this->assertSame('@rostami_cm', TelegramChatIdResolver::normalize('rostami_cm'));
    }
}
