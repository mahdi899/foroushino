<?php

namespace Tests\Unit\Telegram;

use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Services\SupportTicketBridgeService;
use Tests\TestCase;

class SupportTicketBridgeServiceTest extends TestCase
{
    public function test_support_identity_message_includes_name_and_clickable_user_id(): void
    {
        $user = User::factory()->make(['name' => 'علی رضایی']);
        $account = new TelegramAccount([
            'telegram_user_id' => 303360676,
            'first_name' => 'Ali',
            'last_name' => 'Test',
        ]);
        $account->setRelation('user', $user);

        $message = SupportTicketBridgeService::formatSupportIdentityMessage($account, 'خرید');

        $this->assertStringContainsString('علی رضایی', $message);
        $this->assertStringContainsString('tg://openmessage?user_id=303360676', $message);
        $this->assertStringContainsString('>303360676<', $message);
        $this->assertStringContainsString('#خرید', $message);
    }

    public function test_support_identity_message_falls_back_to_telegram_name(): void
    {
        $account = new TelegramAccount([
            'telegram_user_id' => 123456789,
            'first_name' => 'مریم',
            'last_name' => 'احمدی',
        ]);

        $message = SupportTicketBridgeService::formatSupportIdentityMessage($account, 'سات');

        $this->assertStringContainsString('مریم احمدی', $message);
        $this->assertStringContainsString('tg://openmessage?user_id=123456789', $message);
    }
}
