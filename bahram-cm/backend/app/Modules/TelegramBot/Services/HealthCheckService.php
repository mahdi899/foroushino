<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Enums\UpdateStatus;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use App\Modules\TelegramBot\Repositories\TelegramBotRepository;
use Illuminate\Support\Facades\DB;

class HealthCheckService
{
    public function __construct(
        private readonly TelegramBotRepository $bots,
        private readonly TelegramBotClientFactory $clientFactory,
    ) {}

    /** @return array<string, mixed> */
    public function run(): array
    {
        $checks = [
            'database' => $this->checkDatabase(),
            'bots' => [],
            'updates' => $this->checkUpdates(),
        ];

        foreach ($this->bots->allActive() as $bot) {
            $checks['bots'][$bot->key] = $this->checkBot($bot);
        }

        $checks['healthy'] = $checks['database']
            && collect($checks['bots'])->every(fn (array $b) => $b['token_present']);

        return $checks;
    }

    private function checkDatabase(): bool
    {
        try {
            DB::select('select 1');

            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    /** @return array<string, mixed> */
    private function checkBot(\App\Modules\TelegramBot\Models\TelegramBot $bot): array
    {
        $tokenPresent = filled($bot->resolveToken());
        $apiReachable = false;
        $webhookUrl = null;

        if ($tokenPresent) {
            try {
                $client = $this->clientFactory->forBot($bot);
                $client->getMe();
                $apiReachable = true;
                $webhookUrl = data_get($client->getWebhookInfo(), 'url');
            } catch (\Throwable) {
                $apiReachable = false;
            }
        }

        return [
            'token_present' => $tokenPresent,
            'api_reachable' => $apiReachable,
            'webhook_url' => $webhookUrl,
        ];
    }

    /** @return array<string, int> */
    private function checkUpdates(): array
    {
        return [
            'pending' => TelegramUpdate::query()->where('status', UpdateStatus::Pending)->count(),
            'failed' => TelegramUpdate::query()->where('status', UpdateStatus::Failed)->count(),
        ];
    }
}
