<?php

namespace App\Console\Commands;

use App\Models\AppSetting;
use App\Models\IntegrationToken;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class WireBahramBridgeCommand extends Command
{
    protected $signature = 'bahram:wire-bridge
        {--callback-url=https://rostami.app/api/v1/integrations/inbound/sat-status : Bahram sat-status callback URL}
        {--callback-token= : Existing Bahram callback:lead-status token}
        {--issue-inbound-token : Create a Saat inbound:applications token for Bahram}
        {--inbound-token-name=Bahram production : Name for issued inbound token}';

    protected $description = 'Wire Saat ↔ Bahram callback URL/token and optionally issue an inbound integration token';

    public function handle(): int
    {
        $callbackUrl = trim((string) $this->option('callback-url'));
        $callbackToken = trim((string) ($this->option('callback-token') ?: ''));

        $settings = [
            'bahram_callback_url' => $callbackUrl,
        ];

        if ($callbackToken !== '') {
            $settings['bahram_callback_token'] = $callbackToken;
        }

        AppSetting::syncMany($settings);

        $this->info('Bahram callback settings saved.');
        $this->line('  callback_url: '.$callbackUrl);
        $this->line('  callback_token: '.(AppSetting::bahramCallbackTokenConfigured() ? 'set' : '(empty)'));

        if ($this->option('issue-inbound-token')) {
            $plain = 'saat_'.Str::random(48);
            IntegrationToken::query()->create([
                'name' => (string) $this->option('inbound-token-name'),
                'token_hash' => hash('sha256', $plain),
                'abilities' => ['inbound:applications'],
                'created_by' => null,
            ]);
            $this->warn('Inbound token (copy once into Bahram SAT API settings):');
            $this->line($plain);
            $this->line('Applications URL: https://sat.center/api/v1/integrations/inbound/applications');
            $this->line('Ping URL: https://sat.center/api/v1/integrations/inbound/ping');
        }

        $hmac = (string) config('security.hmac.secret', '');
        if ($hmac === '') {
            $this->error('SAT_SYNC_HMAC_SECRET is empty on this server — Bahram↔Saat HMAC will fail.');

            return self::FAILURE;
        }

        $this->info('HMAC secret configured (length '.strlen($hmac).').');

        return self::SUCCESS;
    }
}
