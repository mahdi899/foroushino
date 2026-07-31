<?php

namespace App\Modules\TelegramBot\Http\Middleware;

use App\Modules\TelegramBot\Services\BotResolver;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyTelegramWebhookSecret
{
    public function __construct(
        private readonly BotResolver $botResolver,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $botKey = (string) $request->route('botKey');

        try {
            $bot = $this->botResolver->resolve($botKey);
        } catch (\Throwable) {
            abort(404);
        }

        // Inactive bots still accept webhooks — MessageHandler / CallbackQueryHandler
        // reject regular users but allow bot admins to test and configure.

        $expected = (string) ($bot->resolveWebhookSecret() ?? '');

        if ($expected === '' || ! hash_equals($expected, (string) $request->header('X-Telegram-Bot-Api-Secret-Token', ''))) {
            abort(403);
        }

        $request->attributes->set('telegram_bot', $bot);

        return $next($request);
    }
}
