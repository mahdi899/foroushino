<?php

namespace Tests\Unit\Telegram;

use App\Modules\TelegramBot\Clients\FakeTelegramBotClient;
use Tests\TestCase;

class FakeTelegramBotClientTest extends TestCase
{
    public function test_records_method_calls(): void
    {
        $client = new FakeTelegramBotClient;

        $client->sendMessage(123, 'hello');
        $client->getMe();

        $this->assertSame(['sendMessage', 'getMe'], $client->calledMethods());
        $this->assertTrue($client->wasCalled('sendMessage'));
        $this->assertSame(1, $client->callCount('sendMessage'));
    }

    public function test_queues_custom_responses(): void
    {
        $client = new FakeTelegramBotClient;
        $client->queueResponse('getMe', ['id' => 99, 'username' => 'queued_bot']);

        $result = $client->getMe();

        $this->assertSame(99, $result['id']);
        $this->assertSame('queued_bot', $result['username']);
    }

    public function test_set_webhook_returns_true_by_default(): void
    {
        $client = new FakeTelegramBotClient;

        $this->assertTrue($client->setWebhook('https://example.test/webhook', 'secret'));
        $this->assertTrue($client->wasCalled('setWebhook'));
    }
}
