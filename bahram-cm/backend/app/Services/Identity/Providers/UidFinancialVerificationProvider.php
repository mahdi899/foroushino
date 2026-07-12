<?php

namespace App\Services\Identity\Providers;

use App\Enums\IdentityCapability;
use App\Enums\OwnershipVerificationResult;
use App\Models\IdentityProviderConfig;
use App\Services\Identity\Contracts\FinancialOwnershipVerificationProvider;
use App\Services\Identity\DTOs\MobileOwnershipVerificationResult;
use App\Services\Identity\DTOs\ProviderConnectionResult;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * U-ID financial ownership adapter (card/IBAN ↔ national code).
 *
 * @see https://u-id.net/card-validate-docs/
 * @see https://u-id.net/iban-validate-docs/
 */
class UidFinancialVerificationProvider implements FinancialOwnershipVerificationProvider
{
    public const SLUG = 'uid-financial';

    public function slug(): string
    {
        return self::SLUG;
    }

    /** @return list<IdentityCapability> */
    public function capabilities(): array
    {
        return [
            IdentityCapability::CardNationalCodeMatch,
            IdentityCapability::IbanNationalCodeMatch,
        ];
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
                'business_id و business_token برای سرویس یوآیدی مالی تنظیم نشده‌اند.'
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

    public function verifyCard(string $cardNumber, string $nationalCode, string $birthDate): MobileOwnershipVerificationResult
    {
        return $this->postOwnership(
            (string) ($this->config()?->settings['card_verify_path'] ?? '/api/validate/card/ownership'),
            [
                'cardNumber' => $cardNumber,
                'nationalId' => $nationalCode,
                'birthDate' => $birthDate,
            ],
        );
    }

    public function verifyIban(string $iban, string $nationalCode, string $birthDate): MobileOwnershipVerificationResult
    {
        return $this->postOwnership(
            (string) ($this->config()?->settings['iban_verify_path'] ?? '/api/validate/iban/ownership'),
            [
                'iban' => strtoupper($iban),
                'nationalId' => $nationalCode,
                'birthDate' => $birthDate,
            ],
        );
    }

    public function inquireCard(string $cardNumber): ?array
    {
        if (! $this->isConfigured()) {
            return null;
        }

        $config = $this->config();
        $credentials = $config->getCredentials();
        $settings = $config->settings ?? [];
        $baseUrl = rtrim((string) ($settings['base_url'] ?? 'https://json-api.uid.ir'), '/');
        $path = (string) ($settings['card_info_path'] ?? '/api/inquiry/card-info');

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
                    'cardNumber' => $cardNumber,
                ]);

            if (! $response->successful()) {
                return null;
            }

            $json = $response->json() ?? [];
            $owner = data_get($json, 'owners.0');

            return [
                'iban' => is_string(data_get($json, 'accountBasicInformation.iban'))
                    ? data_get($json, 'accountBasicInformation.iban')
                    : null,
                'bank_name' => is_string(data_get($json, 'accountBasicInformation.bankInformation.bankName'))
                    ? data_get($json, 'accountBasicInformation.bankInformation.bankName')
                    : null,
                'holder_name' => is_array($owner)
                    ? trim(((string) ($owner['firstName'] ?? '')).' '.((string) ($owner['lastName'] ?? '')))
                    : null,
            ];
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function postOwnership(string $path, array $payload): MobileOwnershipVerificationResult
    {
        $started = hrtime(true);

        if (! $this->isConfigured()) {
            return new MobileOwnershipVerificationResult(
                OwnershipVerificationResult::ProviderError,
                'not_configured',
                'سرویس یوآیدی مالی پیکربندی نشده است.',
                null,
                $this->elapsedMs($started),
            );
        }

        $config = $this->config();
        $credentials = $config->getCredentials();
        $settings = $config->settings ?? [];
        $baseUrl = rtrim((string) ($settings['base_url'] ?? 'https://json-api.uid.ir'), '/');

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
                    ...$payload,
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
        } catch (RequestException) {
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
