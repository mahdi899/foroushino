<?php

namespace App\Console\Commands;

use App\Models\SatIntegrationToken;
use App\Services\Sat\SatOutboundSyncService;
use App\Support\SatIntegrationConfig;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class ConfigureSatOutboundCommand extends Command
{
    protected $signature = 'sat:configure-outbound
        {--url=https://sat.center/api/v1/integrations/inbound/applications : SAT inbound applications URL}
        {--token= : Saat IntegrationToken plain text (saat_…)}
        {--enable : Enable automatic push}
        {--issue-callback-token : Create a Bahram callback:lead-status token for Saat}
        {--callback-token-name=Saat production callback : Name for issued callback token}
        {--test : Ping SAT after saving}';

    protected $description = 'Configure Bahram → sat.center outbound sync (URL, token, enable) and optionally issue a callback token';

    public function handle(SatOutboundSyncService $sync): int
    {
        $url = trim((string) $this->option('url'));
        $token = trim((string) ($this->option('token') ?: ''));
        $enable = (bool) $this->option('enable');

        $payload = [
            'enabled' => $enable || SatIntegrationConfig::get()['enabled'],
            'api_url' => $url !== '' ? $url : null,
        ];

        if ($token !== '') {
            $payload['api_token'] = $token;
        }

        if ($enable) {
            $payload['enabled'] = true;
        }

        SatIntegrationConfig::save($payload);

        $view = SatIntegrationConfig::publicView();
        $this->info('Outbound config saved.');
        $this->line('  enabled: '.($view['enabled'] ? 'yes' : 'no'));
        $this->line('  api_url: '.($view['api_url'] ?? '(empty)'));
        $this->line('  token: '.($view['api_token_set'] ? ($view['api_token_preview'] ?? 'set') : '(empty)'));

        if ($this->option('issue-callback-token')) {
            $plain = 'sat_'.Str::random(48);
            SatIntegrationToken::query()->create([
                'name' => (string) $this->option('callback-token-name'),
                'token_hash' => hash('sha256', $plain),
                'abilities' => ['callback:lead-status'],
                'created_by' => null,
            ]);
            $this->warn('Callback token (copy once into Saat bahram_callback_token):');
            $this->line($plain);
            $this->line('Callback URL: https://rostami.app/api/v1/integrations/inbound/sat-status');
        }

        if ($this->option('test')) {
            $result = $sync->testConnection();
            if ($result['ok']) {
                $this->info($result['message']);
            } else {
                $this->error($result['message']);

                return self::FAILURE;
            }
        }

        return self::SUCCESS;
    }
}
