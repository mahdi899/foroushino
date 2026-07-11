<?php

namespace App\Services\Identity\Providers;

use App\Enums\IdentityCapability;
use App\Enums\OwnershipVerificationResult;
use App\Models\IdentityProviderConfig;
use App\Services\Identity\Contracts\MobileOwnershipVerificationProvider;
use App\Services\Identity\DTOs\MobileOwnershipVerificationResult;
use App\Services\Identity\DTOs\ProviderConnectionResult;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * API.ir Shahkar adapter — token auth, configurable base URL.
 */
class ApiIrShahkarProvider implements MobileOwnershipVerificationProvider
{
    public const SLUG = 'api-ir-shahkar';

    public function slug(): string
    {
        return self::SLUG;
    }

    /** @return list<IdentityCapability> */
    public function capabilities(): array
    {
        return [IdentityCapability::MobileNationalCodeMatch];
    }

    public function isConfigured(): bool
    {
        $config = $this->config();
        if (! $config || ! $config->is_enabled) {
            return false;
        }

        $credentials = $config->getCredentials();

        return filled($credentials['api_token'] ?? null)
            && filled($config->settings['base_url'] ?? null);
    }

    public function testConnection(): ProviderConnectionResult
    {
        if (! $this->isConfigured()) {
            return ProviderConnectionResult::configurationIncomplete(
                'api_token و base_url برای سرویس API.ir شاهکار تنظیم نشده‌اند.'
            );
        }

        $config = $this->config();
        $credentials = $config->getCredentials();
        $baseUrl = rtrim((string) $config->settings['base_url'], '/');

        try {
            $response = Http::timeout(10)
                ->withToken((string) $credentials['api_token'])
                ->acceptJson()
                ->get($baseUrl.'/');

            if (in_array($response->status(), [401, 403], true)) {
                return ProviderConnectionResult::invalidCredentials('توکن API.ir نامعتبر است.');
            }

            return ProviderConnectionResult::connected('سرویس API.ir در دسترس است.');
        } catch (ConnectionException) {
            return ProviderConnectionResult::providerUnavailable('ارتباط با سرویس API.ir برقرار نشد.');
        } catch (Throwable $e) {
            return ProviderConnectionResult::providerUnavailable($e->getMessage() ?: 'خطای ناشناخته در تست اتصال.');
        }
    }

    public function verify(string $mobile, string $nationalCode): MobileOwnershipVerificationResult
    {
        $started = hrtime(true);

        if (! $this->isConfigured()) {
            return new MobileOwnershipVerificationResult(
                OwnershipVerificationResult::ProviderError,
                'not_configured',
                'سرویس API.ir شاهکار پیکربندی نشده است.',
                null,
                $this->elapsedMs($started),
            );
        }

        $config = $this->config();
        $credentials = $config->getCredentials();
        $settings = $config->settings ?? [];
        $baseUrl = rtrim((string) $settings['base_url'], '/');
        $path = (string) ($settings['verify_path'] ?? '/api/shahkar');

        try {
            $response = Http::timeout((int) ($settings['timeout'] ?? 20))
                ->withToken((string) $credentials['api_token'])
                ->acceptJson()
                ->asJson()
                ->post($baseUrl.$path, [
                    'nationalCode' => $nationalCode,
                    'national_code' => $nationalCode,
                    'mobile' => $mobile,
                    'mobileNumber' => $mobile,
                ]);

            $duration = $this->elapsedMs($started);
            $json = $response->json() ?? [];
            $requestId = data_get($json, 'track_id')
                ?? data_get($json, 'requestId')
                ?? data_get($json, 'result.track_id')
                ?? $response->header('X-Request-Id');

            if (in_array($response->status(), [401, 403], true)) {
                return new MobileOwnershipVerificationResult(
                    OwnershipVerificationResult::Unauthorized,
                    (string) $response->status(),
                    'دسترسی به سرویس API.ir مجاز نیست.',
                    is_string($requestId) ? $requestId : null,
                    $duration,
                );
            }

            if ($response->status() === 429) {
                return new MobileOwnershipVerificationResult(
                    OwnershipVerificationResult::RateLimited,
                    '429',
                    'محدودیت نرخ درخواست سرویس API.ir.',
                    is_string($requestId) ? $requestId : null,
                    $duration,
                );
            }

            if ($response->serverError()) {
                return new MobileOwnershipVerificationResult(
                    OwnershipVerificationResult::TechnicalError,
                    (string) $response->status(),
                    'خطای فنی سرویس API.ir.',
                    is_string($requestId) ? $requestId : null,
                    $duration,
                );
            }

            return $this->normalize($json, $duration, is_string($requestId) ? $requestId : null, (string) $response->status());
        } catch (ConnectionException) {
            return new MobileOwnershipVerificationResult(
                OwnershipVerificationResult::TechnicalError,
                'connection_error',
                'ارتباط با سرویس API.ir برقرار نشد.',
                null,
                $this->elapsedMs($started),
            );
        } catch (Throwable) {
            return new MobileOwnershipVerificationResult(
                OwnershipVerificationResult::ProviderError,
                'unexpected',
                'پاسخ سرویس API.ir قابل پردازش نبود.',
                null,
                $this->elapsedMs($started),
            );
        }
    }

    /**
     * @param  array<string, mixed>  $json
     */
    private function normalize(array $json, int $duration, ?string $requestId, string $httpStatus): MobileOwnershipVerificationResult
    {
        $matched = data_get($json, 'isMatched')
            ?? data_get($json, 'is_matched')
            ?? data_get($json, 'matched')
            ?? data_get($json, 'result.isMatched')
            ?? data_get($json, 'data.isMatched')
            ?? data_get($json, 'data.matched');

        if (is_bool($matched)) {
            return new MobileOwnershipVerificationResult(
                $matched ? OwnershipVerificationResult::Matched : OwnershipVerificationResult::Mismatched,
                $httpStatus,
                is_string(data_get($json, 'description') ?? data_get($json, 'message'))
                    ? (string) (data_get($json, 'description') ?? data_get($json, 'message'))
                    : null,
                $requestId,
                $duration,
            );
        }

        return new MobileOwnershipVerificationResult(
            OwnershipVerificationResult::ProviderError,
            $httpStatus !== '' ? $httpStatus : 'unknown_shape',
            'ساختار پاسخ سرویس API.ir شناسایی نشد.',
            $requestId,
            $duration,
        );
    }

    private function config(): ?IdentityProviderConfig
    {
        return IdentityProviderConfig::query()->where('slug', self::SLUG)->first();
    }

    private function elapsedMs(int $started): int
    {
        return (int) max(0, (hrtime(true) - $started) / 1_000_000);
    }
}
