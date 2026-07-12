<?php

namespace Database\Seeders;

use App\Models\SatIntegrationToken;
use App\Support\SatIntegrationConfig;
use Illuminate\Database\Seeder;

/**
 * Local/dev bootstrap for Bahram ↔ SAT API connection.
 * Re-run safe: updates config and ensures one active dev token exists.
 */
class SatIntegrationBootstrapSeeder extends Seeder
{
    /** Plaintext dev token — change in production. */
    public const DEV_TOKEN = 'sat_dev_bahram_local_2026_change_me';

    public const DEV_APPLICATIONS_URL = 'http://127.0.0.1:8000/api/v1/integrations/inbound/applications';

    public const DEV_PING_URL = 'http://127.0.0.1:8000/api/v1/integrations/inbound/ping';

    public function run(): void
    {
        $hash = hash('sha256', self::DEV_TOKEN);

        $token = SatIntegrationToken::query()->firstOrCreate(
            ['token_hash' => $hash],
            [
                'name' => 'سایت بهرام (توسعه محلی)',
                'abilities' => ['inbound:applications'],
                'created_by' => null,
            ]
        );

        if ($token->revoked_at !== null) {
            $token->update(['revoked_at' => null, 'name' => 'سایت بهرام (توسعه محلی)']);
        }

        SatIntegrationConfig::save([
            'enabled' => true,
            'api_url' => self::DEV_APPLICATIONS_URL,
            'api_token' => self::DEV_TOKEN,
        ]);

        $this->command?->info('SAT integration bootstrap complete.');
        $this->command?->line('Applications URL: '.self::DEV_APPLICATIONS_URL);
        $this->command?->line('Ping URL: '.self::DEV_PING_URL);
        $this->command?->line('Token: '.self::DEV_TOKEN);
        $this->command?->warn('این توکن فقط برای توسعه محلی است — در پروداکشن حتماً عوض کنید.');
    }
}
