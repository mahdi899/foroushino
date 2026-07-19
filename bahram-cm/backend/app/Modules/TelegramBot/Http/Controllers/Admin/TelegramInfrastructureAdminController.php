<?php

namespace App\Modules\TelegramBot\Http\Controllers\Admin;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Http\Controllers\Admin\Concerns\AuthorizesTelegramAdmin;
use App\Services\TelegramInfrastructureService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TelegramInfrastructureAdminController
{
    use AuthorizesTelegramAdmin;

    public function __construct(
        private readonly TelegramInfrastructureService $infrastructure,
        private readonly TelegramBotClientFactory $clients,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.settings.manage');

        return response()->json(['data' => $this->infrastructure->adminView()]);
    }

    public function update(Request $request): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.settings.manage');

        $data = $request->validate([
            'mode' => ['sometimes', 'nullable', 'string', 'in:direct,worker'],
            'worker_url' => ['sometimes', 'nullable', 'string', 'max:512'],
            'base_url' => ['sometimes', 'nullable', 'string', 'max:512'],
            'connection_token_input' => ['sometimes', 'nullable', 'string', 'max:256'],
            'bearer_token_input' => ['sometimes', 'nullable', 'string', 'max:256'],
            'webhook_secret_input' => ['sometimes', 'nullable', 'string', 'max:256'],
        ]);

        if ($request->exists('worker_url')) {
            $data['worker_url'] = trim((string) $request->input('worker_url', ''));
        }

        try {
            $view = $this->infrastructure->update($data);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => ['code' => 'validation_error', 'message_fa' => $e->getMessage()],
            ], 422);
        }

        return response()->json(['data' => $view]);
    }

    public function registerWebhook(Request $request): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.settings.manage');

        return response()->json([
            'data' => $this->infrastructure->registerProductionWebhook($this->clients),
        ]);
    }

    public function test(Request $request): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.settings.manage');

        return response()->json([
            'data' => $this->infrastructure->testConnection($this->clients),
        ]);
    }

    public function suggestSecrets(Request $request): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.settings.manage');

        return response()->json([
            'data' => [
                'bearer_token' => Str::random(64),
                'webhook_secret' => Str::random(32),
            ],
        ]);
    }
}
