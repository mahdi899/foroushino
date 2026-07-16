<?php

namespace App\Modules\TelegramBot\Http\Controllers;

use App\Modules\TelegramBot\Exceptions\InvalidTelegramInitDataException;
use App\Modules\TelegramBot\Services\AccountLinkService;
use App\Modules\TelegramBot\Services\BotResolver;
use App\Modules\TelegramBot\Services\LoginTokenService;
use App\Modules\TelegramBot\Services\MiniAppAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MiniAppAuthController
{
    public function __construct(
        private readonly BotResolver $botResolver,
        private readonly MiniAppAuthService $miniAppAuth,
        private readonly AccountLinkService $accountLinks,
        private readonly LoginTokenService $loginTokens,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'init_data' => ['required', 'string'],
            'bot_key' => ['nullable', 'string'],
        ]);

        $bot = $this->botResolver->resolve($validated['bot_key'] ?? config('telegram_bot.default_bot_key', 'production'));

        try {
            $telegramUser = $this->miniAppAuth->verify($bot, $validated['init_data']);
        } catch (InvalidTelegramInitDataException $e) {
            return response()->json([
                'error' => [
                    'code' => 'invalid_init_data',
                    'message_fa' => $e->getMessage(),
                ],
            ], 422);
        }

        $account = $this->accountLinks->findOrCreateAccount(
            $bot,
            $telegramUser['id'],
            $telegramUser['username'],
            $telegramUser['first_name'],
            $telegramUser['last_name'],
        );

        $issued = $this->loginTokens->create($account);

        return response()->json([
            'data' => [
                'login_token' => $issued['token'],
                'expires_at' => $issued['expires_at']?->toIso8601String(),
                'telegram_user_id' => $account->telegram_user_id,
                'is_linked' => $account->isLinked(),
            ],
        ]);
    }
}
