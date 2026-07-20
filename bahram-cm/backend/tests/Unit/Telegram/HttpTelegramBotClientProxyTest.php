<?php

namespace Tests\Unit\Telegram;

use App\Modules\TelegramBot\Clients\HttpTelegramBotClient;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class HttpTelegramBotClientProxyTest extends TestCase
{
    public function test_sends_proxy_bearer_when_worker_bridge_is_used(): void
    {
        Http::fake([
            'https://bridge.example.workers.dev/*' => Http::response([
                'ok' => true,
                'result' => ['id' => 1, 'username' => 'demo_bot'],
            ]),
        ]);

        $proxyToken = str_repeat('a', 32);
        $client = new HttpTelegramBotClient('123456:ABC-DEF', 'https://bridge.example.workers.dev', $proxyToken);
        $client->getMe();

        Http::assertSent(function (Request $request) use ($proxyToken) {
            return $request->url() === 'https://bridge.example.workers.dev/bot123456:ABC-DEF/getMe'
                && $request->hasHeader('Authorization', 'Bearer '.$proxyToken);
        });
    }

    public function test_does_not_send_proxy_bearer_for_direct_api(): void
    {
        Http::fake([
            'https://api.telegram.org/*' => Http::response([
                'ok' => true,
                'result' => ['id' => 1, 'username' => 'demo_bot'],
            ]),
        ]);

        $client = new HttpTelegramBotClient('123456:ABC-DEF', 'https://api.telegram.org');
        $client->getMe();

        Http::assertSent(function (Request $request) {
            return $request->url() === 'https://api.telegram.org/bot123456:ABC-DEF/getMe'
                && ! $request->hasHeader('Authorization');
        });
    }
}
