<?php

namespace App\Modules\TelegramBot;

use App\Modules\TelegramBot\Clients\FakeTelegramBotClient;
use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Console\TelegramCleanupCommand;
use App\Modules\TelegramBot\Console\TelegramHealthCheckCommand;
use App\Modules\TelegramBot\Console\TelegramRetryFailedUpdatesCommand;
use App\Modules\TelegramBot\Console\TelegramSyncBotsCommand;
use App\Modules\TelegramBot\Console\TelegramWebhookDeleteCommand;
use App\Modules\TelegramBot\Console\TelegramWebhookInfoCommand;
use App\Modules\TelegramBot\Console\TelegramWebhookSetCommand;
use App\Modules\TelegramBot\Contracts\TelegramBotClientInterface;
use App\Modules\TelegramBot\Http\Middleware\VerifyTelegramWebhookSecret;
use App\Modules\TelegramBot\Services\BotResolver;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Routing\Router;
use Illuminate\Support\ServiceProvider;

class TelegramBotServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/config/telegram_bot.php', 'telegram_bot');

        $this->app->singleton(TelegramBotClientFactory::class);
        $this->app->singleton(FakeTelegramBotClient::class);

        $this->app->bind(TelegramBotClientInterface::class, function (Application $app): TelegramBotClientInterface {
            return $app->make(TelegramBotClientFactory::class)->forDefaultBot();
        });
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/Database/Migrations');
        $this->loadRoutesFrom(base_path('routes/telegram.php'));

        /** @var Router $router */
        $router = $this->app->make(Router::class);
        $router->aliasMiddleware('telegram.webhook', VerifyTelegramWebhookSecret::class);

        if ($this->app->runningInConsole()) {
            $this->commands([
                TelegramWebhookSetCommand::class,
                TelegramWebhookDeleteCommand::class,
                TelegramWebhookInfoCommand::class,
                TelegramHealthCheckCommand::class,
                TelegramRetryFailedUpdatesCommand::class,
                TelegramCleanupCommand::class,
                TelegramSyncBotsCommand::class,
            ]);

            return;
        }

        try {
            $this->app->make(BotResolver::class)->syncAllFromConfig();
        } catch (\Throwable) {
            // Database may not be ready during install.
        }
    }
}
