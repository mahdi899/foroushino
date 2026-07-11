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

        $zoneId = trim((string) config('bahram.cloudflare.zone_id', ''));
        $cfToken = trim((string) config('bahram.cloudflare.api_token', ''));
        $arvanKey = trim((string) config('bahram.arvan.api_key', ''));
        $arvanDomain = trim((string) config('bahram.arvan.domain', ''));
        $arvanMedia = trim((string) config('bahram.arvan.media_domain', ''));

        $value = [
            'revalidate_webhook_url' => $webhookUrl,
            'revalidate_secret' => $secret,
        ];

        if ($zoneId !== '') {
            $value['cloudflare_zone_id'] = $zoneId;
        }
        if ($cfToken !== '') {
            $value['cloudflare_api_token'] = $cfToken;
        }
        if ($arvanKey !== '') {
            $value['arvan_api_key'] = $arvanKey;
        }
        if ($arvanDomain !== '') {
            $value['arvan_domain'] = $arvanDomain;
        }
        if ($arvanMedia !== '') {
            $value['arvan_media_domain'] = $arvanMedia;
        }
        $cdnProvider = strtolower(trim((string) config('bahram.cdn_provider', '')));
        if (in_array($cdnProvider, ['arvan', 'cloudflare', 'none'], true)) {
            $value['cdn_provider'] = $cdnProvider;
        }

        Setting::query()->updateOrCreate(
            ['group' => CacheIntegrationService::GROUP, 'key' => CacheIntegrationService::KEY],
            ['value' => $value],
        );

        CacheIntegrationService::forgetCachedConfig();
    }
}
