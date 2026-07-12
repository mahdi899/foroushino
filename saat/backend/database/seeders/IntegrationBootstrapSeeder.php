<?php

namespace Database\Seeders;

use App\Models\IntegrationToken;
use Illuminate\Database\Seeder;

class IntegrationBootstrapSeeder extends Seeder
{
    public const DEV_TOKEN = 'sat_dev_bahram_local_2026_change_me';

    public function run(): void
    {
        $hash = hash('sha256', self::DEV_TOKEN);

        IntegrationToken::query()->firstOrCreate(
            ['token_hash' => $hash],
            [
                'name' => 'سایت بهرام (توسعه محلی)',
                'abilities' => ['inbound:applications'],
                'created_by' => null,
            ]
        );

        $this->command?->info('Saat integration token ready.');
        $this->command?->line('Applications URL: http://127.0.0.1:8000/api/v1/integrations/inbound/applications');
        $this->command?->line('Ping URL: http://127.0.0.1:8000/api/v1/integrations/inbound/ping');
        $this->command?->line('Token: '.self::DEV_TOKEN);
    }
}
