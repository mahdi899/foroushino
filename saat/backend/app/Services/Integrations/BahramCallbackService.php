<?php

namespace App\Services\Integrations;

use App\Models\Lead;
use App\Support\HmacSigner;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Reverse channel: reports a lead status change back to Bahram (Server 1)
 * for leads that originated there (`bahram_application_id` set). Signed
 * with the same HMAC scheme used on the inbound direction, gated by the
 * proxy-origin header and a Bahram-issued Bearer token with the
 * `callback:lead-status` ability.
 */
class BahramCallbackService
{
    public function reportStatus(Lead $lead): bool
    {
        if ($lead->bahram_application_id === null) {
            return true;
        }

        $config = config('security.bahram_callback');
        $url = trim((string) ($config['url'] ?? ''));
        $token = (string) ($config['token'] ?? '');

        if ($url === '' || $token === '') {
            return false;
        }

        $payload = [
            'bahram_application_id' => $lead->bahram_application_id,
            'status' => $lead->status?->value ?? (string) $lead->status,
        ];

        try {
            $response = Http::timeout(10)
                ->acceptJson()
                ->withToken($token)
                ->withHeaders($this->signedHeaders($payload, (string) ($config['hmac_secret'] ?? '')))
                ->post($url, $payload);

            if (! $response->successful()) {
                Log::warning('Bahram status callback failed', [
                    'lead_id' => $lead->id,
                    'status' => $response->status(),
                    'body' => $response->json(),
                ]);

                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('Bahram status callback exception', [
                'lead_id' => $lead->id,
                'message' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, string>
     */
    private function signedHeaders(array $payload, string $hmacSecret): array
    {
        $headerName = (string) config('security.proxy_origin.header', 'X-Proxy-Origin');
        $allowed = (array) config('security.proxy_origin.allowed_values', []);
        $originValue = in_array('Internal-Sync', $allowed, true) ? 'Internal-Sync' : ($allowed[0] ?? 'Internal-Sync');

        return array_merge(
            [$headerName => $originValue],
            HmacSigner::headersFor($payload, $hmacSecret !== '' ? $hmacSecret : null),
        );
    }
}
