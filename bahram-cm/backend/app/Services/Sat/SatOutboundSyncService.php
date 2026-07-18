<?php

namespace App\Services\Sat;

use App\Models\SatApplication;
use App\Support\HmacSigner;
use App\Support\SatIntegrationConfig;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * One-way push from Bahram → external SAT domain when application is accepted.
 */
class SatOutboundSyncService
{
    public function syncAcceptedApplication(SatApplication $application, bool $force = false): bool
    {
        if ($application->synced_to_sat_at !== null && ! $force) {
            return true;
        }

        if (! SatIntegrationConfig::isReady()) {
            $application->update([
                'sat_sync_error' => 'اتصال API سات پیکربندی نشده است.',
            ]);

            return false;
        }

        $config = SatIntegrationConfig::get();
        $url = rtrim((string) $config['api_url'], '/');

        $payload = [
            'bahram_application_id' => $application->id,
            'name' => $application->name,
            'mobile' => $application->mobile,
            'city' => $application->city,
            'age' => $application->age,
            'admin_note' => $application->admin_note,
            'accepted_at' => $application->reviewed_at?->toIso8601String() ?? now()->toIso8601String(),
            'submitted_at' => $application->submitted_at?->toIso8601String(),
        ];

        try {
            $response = Http::timeout(15)
                ->acceptJson()
                ->withToken((string) $config['api_token'])
                ->withHeaders($this->signedHeaders($payload))
                ->post($url, $payload);

            if (! $response->successful()) {
                $message = $response->json('error.message_fa')
                    ?? $response->json('message')
                    ?? 'خطای HTTP '.$response->status();

                $application->update(['sat_sync_error' => (string) $message]);

                Log::warning('SAT outbound sync failed', [
                    'application_id' => $application->id,
                    'status' => $response->status(),
                    'body' => $response->json(),
                ]);

                return false;
            }

            $application->update([
                'synced_to_sat_at' => now(),
                'sat_sync_error' => null,
            ]);

            return true;
        } catch (\Throwable $e) {
            $application->update(['sat_sync_error' => 'خطا در ارتباط با سرور سات.']);

            Log::error('SAT outbound sync exception', [
                'application_id' => $application->id,
                'message' => $e->getMessage(),
            ]);

            return false;
        }
    }

    public function testConnection(): array
    {
        if (! SatIntegrationConfig::isReady()) {
            return ['ok' => false, 'message' => 'آدرس API و توکن سات را وارد کنید و ذخیره کنید.'];
        }

        return $this->pingWithConfig(SatIntegrationConfig::get());
    }

    /** @param array{api_url: string|null, api_token: string|null} $config */
    public function pingWithConfig(array $config): array
    {
        $base = rtrim((string) ($config['api_url'] ?? ''), '/');
        if ($base === '' || empty($config['api_token'])) {
            return ['ok' => false, 'message' => 'آدرس API و توکن سات را وارد کنید.'];
        }

        $pingUrl = str_ends_with($base, '/applications')
            ? str_replace('/applications', '/ping', $base)
            : $base.'/ping';

        try {
            $response = Http::timeout(10)
                ->acceptJson()
                ->withToken((string) $config['api_token'])
                ->withHeaders($this->signedHeaders([]))
                ->get($pingUrl);

            if ($response->successful() && ($response->json('success') === true || $response->json('data.status') === 'ok')) {
                return ['ok' => true, 'message' => 'اتصال با سات برقرار است.'];
            }

            return [
                'ok' => false,
                'message' => $response->json('error.message_fa')
                    ?? $response->json('message')
                    ?? 'پاسخ ناموفق از سرور سات (HTTP '.$response->status().').',
            ];
        } catch (\Throwable $e) {
            Log::warning('SAT ping failed', ['url' => $pingUrl, 'error' => $e->getMessage()]);

            return ['ok' => false, 'message' => 'امکان اتصال به سرور سات وجود ندارد. آدرس باید به بک‌اند سات (معمولاً پورت ۸۰۰۰) اشاره کند.'];
        }
    }

    /**
     * Headers required by Saat's proxy-origin gate + HMAC signature
     * verification. Sent on every outbound call, in addition to the
     * per-installation Bearer integration token.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, string>
     */
    private function signedHeaders(array $payload): array
    {
        $headerName = (string) config('security.proxy_origin.header', 'X-Proxy-Origin');
        $allowed = (array) config('security.proxy_origin.allowed_values', []);
        $originValue = in_array('Internal-Sync', $allowed, true) ? 'Internal-Sync' : ($allowed[0] ?? 'Internal-Sync');

        return array_merge(
            [$headerName => $originValue],
            HmacSigner::headersFor($payload),
        );
    }
}
