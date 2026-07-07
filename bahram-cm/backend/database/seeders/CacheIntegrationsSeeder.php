<?php

namespace Database\Seeders;

use App\Models\Setting;
use App\Services\CacheIntegrationService;
use Illuminate\Database\Seeder;

class CacheIntegrationsSeeder extends Seeder
{
    public function run(): void
    {
        $frontend = rtrim((string) config('bahram.frontend_url', 'http://localhost:3000'), '/');
        $webhookUrl = trim((string) config('bahram.revalidate.webhook_url', ''))
            ?: $frontend.'/api/revalidate';
        $secret = trim((string) config('bahram.revalidate.secret', ''))
            ?: 'bahram-dev-revalidate-secret';

        Setting::query()->updateOrCreate(
            ['group' => CacheIntegrationService::GROUP, 'key' => CacheIntegrationService::KEY],
            [
                'value' => [
                    'revalidate_webhook_url' => $webhookUrl,
                    'revalidate_secret' => $secret,
                ],
            ],
        );

        CacheIntegrationService::forgetCachedConfig();
    }
}
