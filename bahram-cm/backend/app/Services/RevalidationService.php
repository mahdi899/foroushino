<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Notifies the Next.js frontend to purge ISR cache for the given tags after an
 * admin content change. Fire-and-forget; failures never block the request.
 */
class RevalidationService
{
    public function __construct(private readonly CacheIntegrationService $integrations) {}

    public function trigger(array $tags, array $paths = []): void
    {
        $url = $this->integrations->revalidateWebhookUrl();
        $secret = $this->integrations->revalidateSecret();
        if (! $url || ! $secret) {
            return;
        }

        try {
            Http::timeout(5)->post($url, [
                'secret' => $secret,
                'tags' => $tags,
                'paths' => $paths,
            ]);
        } catch (\Throwable $e) {
            Log::info('[revalidate] failed: '.$e->getMessage());
        }
    }
}
