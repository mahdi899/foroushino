<?php

use App\Models\IdentityProviderConfig;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $config = IdentityProviderConfig::query()->where('slug', 'api-ir-shahkar')->first();
        if (! $config) {
            return;
        }

        $settings = $config->settings ?? [];
        $baseUrl = strtolower(trim((string) ($settings['base_url'] ?? '')));

        if ($baseUrl === '' || str_contains($baseUrl, 'apif.ir') || ! str_contains($baseUrl, 's.api.ir')) {
            $settings['base_url'] = 'https://s.api.ir';
            $config->settings = $settings;
            $config->saveQuietly();
        }
    }

    public function down(): void
    {
        // Irreversible data fix.
    }
};
