<?php

namespace App\Console\Commands;

use App\Services\CloudflareEdgeHardeningService;
use Illuminate\Console\Command;

class ApplyCloudflareEdgeCommand extends Command
{
    protected $signature = 'cloudflare:apply-edge';

    protected $description = 'Apply Cloudflare Cache Rules + speed/security zone settings from panel credentials';

    public function handle(CloudflareEdgeHardeningService $hardening): int
    {
        $this->info('Applying Cloudflare edge speed & security…');
        $result = $hardening->applySpeedAndSecurity();

        foreach ($result['steps'] as $step) {
            $mark = $step['ok'] ? 'OK' : 'FAIL';
            $this->line("[{$mark}] {$step['id']}: {$step['detail']}");
        }

        if (! empty($result['zone_name'])) {
            $this->info('Zone: '.$result['zone_name']);
        }

        if ($result['ok']) {
            $this->info($result['message']);

            return self::SUCCESS;
        }

        $this->error($result['message']);

        return self::FAILURE;
    }
}
