<?php

namespace App\Modules\TelegramBot\Clients;

use App\Modules\TelegramBot\Contracts\TelegramBotClientInterface;
use App\Modules\TelegramBot\Exceptions\TelegramApiException;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Services\BotResolver;
use App\Services\TelegramInfrastructureService;
use Illuminate\Contracts\Foundation\Application;

class TelegramBotClientFactory
{
    public function __construct(
        private readonly Application $app,
        private readonly BotResolver $resolver,
    ) {}

    public function forDefaultBot(): TelegramBotClientInterface
    {
        return $this->forBot($this->resolver->resolveDefault());
    }

    public function forBot(TelegramBot $bot): TelegramBotClientInterface
    {
        if (config('telegram_bot.use_fake_client') || $this->app->environment('testing')) {
            return $this->app->make(FakeTelegramBotClient::class);
        }

        $token = $bot->resolveToken();

        if (blank($token)) {
            throw TelegramApiException::fromTransportFailure(
                'client.factory',
                sprintf('No token found in env var "%s" for bot "%s".', $bot->token_key, $bot->key),
            );
        }

        $infrastructure = $this->app->make(TelegramInfrastructureService::class);

        return new HttpTelegramBotClient(
            $token,
            $infrastructure->telegramApiBaseUrl(),
            $infrastructure->telegramApiProxyBearerToken(),
        );
    }
}
