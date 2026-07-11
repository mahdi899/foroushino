<?php

namespace App\Services\Identity\Providers;

use App\Enums\IdentityCapability;
use App\Enums\OwnershipVerificationResult;
use App\Models\IdentityProviderConfig;
use App\Services\Identity\Contracts\MobileOwnershipVerificationProvider;
use App\Services\Identity\DTOs\MobileOwnershipVerificationResult;
use App\Services\Identity\DTOs\ProviderConnectionResult;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * U-ID Shahkar adapter (mobile ↔ national code match).
 *
 * @see https://u-id.net/docs-shahkar/
 */
class UidShahkarProvider implements MobileOwnershipVerificationProvider
{
    public const SLUG = 'uid-shahkar';

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

        return filled($credentials['business_id'] ?? null)
            && filled($credentials['business_token'] ?? null);
    }

    public function testConnection(): ProviderConnectionResult
    {
        if (! $this->isConfigured()) {
            return ProviderConnectionResult::configurationIncomplete(
                'business_id و business_token برای سرویس یوآیدی شاهکار تنظیم نشده‌اند.'
            );
        }

        $config = $this->config();
        $baseUrl = rtrim((string) ($config?->settings['base_url'] ?? 'https://json-api.uid.ir'), '/');

        try {
            $response = Http::timeout(10)
                ->acceptJson()
                ->get($baseUrl.'/');

            if ($response->status() === 401 || $response->status() === 403) {
                return ProviderConnectionResult::invalidCredentials('احراز هویت سرویس یوآیدی ناموفق بود.');
            }

            return ProviderConnectionResult::connected('سرویس یوآیدی در دسترس است.');
        } catch (ConnectionException) {
            return ProviderConnectionResult::providerUnavailable('ارتباط با سرویس یوآیدی برقرار نشد.');
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
                'سرویس یوآیدی شاهکار پیکربندی نشده است.',
                null,
                $this->elapsedMs($started),
            );
        }

        $config = $this->config();
        $credentials = $config->getCredentials();
        $settings = $config->settings ?? [];
        $baseUrl = rtrim((string) ($settings['base_url'] ?? 'https://json-api.uid.ir'), '/');
        $path = (string) ($settings['verify_path'] ?? '/api/inquiry/mobile/owner/v2');

        try {
            $response = Http::timeout((int) ($settings['timeout'] ?? 20))
                ->acceptJson()
                ->asJson()
                ->post($baseUrl.$path, [
                    'requestContext' => [
                        'apiInfo' => [
                            'businessId' => $credentials['business_id'],
                            'businessToken' => $credentials['business_token'],
                        ],
                    ],
                    'nationalId' => $nationalCode,
                    'mobileNumber' => $mobile,
                ]);

            $duration = $this->elapsedMs($started);
            $json = $response->json() ?? [];
            $requestId = data_get($json, 'responseContext.requestId')
                ?? data_get($json, 'requestId')
                ?? $response->header('X-Request-Id');

            if ($response->status() === 401 || $response->status() === 403) {
                return new MobileOwnershipVerificationResult(
                    OwnershipVerificationResult::Unauthorized,
                    (string) $response->status(),
                    'دسترسی به سرویس یوآیدی مجاز نیست.',
                    is_string($requestId) ? $requestId : null,
                    $duration,
                );
            }

            if ($response->status() === 429) {
                return new MobileOwnershipVerificationResult(
                    OwnershipVerificationResult::RateLimited,
                    '429',
                    'محدودیت نرخ درخواست سرویس یوآیدی.',
                    is_string($requestId) ? $requestId : null,
                    $duration,
                );
            }

            if ($response->serverError()) {
                return new MobileOwnershipVerificationResult(
                    OwnershipVerificationResult::TechnicalError,
                    (string) $response->status(),
                    'خطای فنی سرویس یوآیدی.',
                    is_string($requestId) ? $requestId : null,
                    $duration,
                );
            }

            return $this->normalize($json, $duration, is_string($requestId) ? $requestId : null);
        } catch (ConnectionException) {
            return new MobileOwnershipVerificationResult(
                OwnershipVerificationResult::TechnicalError,
                'connection_error',
                'ارتباط با سرویس یوآیدی برقرار نشد.',
                null,
                $this->elapsedMs($started),
            );
        } catch (RequestException $e) {
            return new MobileOwnershipVerificationResult(
                OwnershipVerificationResult::TechnicalError,
                'request_exception',
                'خطا در فراخوانی سرویس یوآیدی.',
                null,
                $this->elapsedMs($started),
            );
        } catch (Throwable) {
            return new MobileOwnershipVerificationResult(
                OwnershipVerificationResult::ProviderError,
                'unexpected',
                'پاسخ سرویس یوآیدی قابل پردازش نبود.',
                null,
                $this->elapsedMs($started),
            );
        }
    }

    /**
     * @param  array<string, mixed>  $json
     */
    private function normalize(array $json, int $duration, ?string $requestId): MobileOwnershipVerificationResult
    {
        $statusCode = data_get($json, 'responseContext.status.code');
        $statusMessage = data_get($json, 'responseContext.status.message');
        $message = is_string($statusMessage) ? $statusMessage : null;

        if (array_key_exists('isMatched', $json) && is_bool($json['isMatched'])) {
            return new MobileOwnershipVerificationResult(
                $json['isMatched']
                    ? OwnershipVerificationResult::Matched
                    : OwnershipVerificationResult::Mismatched,
                $statusCode !== null ? (string) $statusCode : null,
                $message,
                $requestId,
                $duration,
            );
        }

        // Known error envelope without isMatched.
        if ($statusCode !== null && (int) $statusCode !== 0) {
            $code = (int) $statusCode;
            $result = match (true) {
                in_array($code, [401, 403], true) => OwnershipVerificationResult::Unauthorized,
                $code === 429 => OwnershipVerificationResult::RateLimited,
                $code >= 500 => OwnershipVerificationResult::TechnicalError,
                default => OwnershipVerificationResult::ProviderError,
            };

            return new MobileOwnershipVerificationResult(
                $result,
                (string) $code,
                $message ?? 'خطای سرویس یوآیدی.',
                $requestId,
                $duration,
            );
        }

        return new MobileOwnershipVerificationResult(
            OwnershipVerificationResult::ProviderError,
            $statusCode !== null ? (string) $statusCode : 'unknown_shape',
            $message ?? 'ساختار پاسخ سرویس یوآیدی شناسایی نشد.',
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
