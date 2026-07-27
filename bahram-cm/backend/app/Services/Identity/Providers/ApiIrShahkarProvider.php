<?php

namespace App\Services\Identity\Providers;

use App\Enums\IdentityCapability;
use App\Enums\OwnershipVerificationResult;
use App\Models\IdentityProviderConfig;
use App\Services\Identity\Contracts\FinancialOwnershipVerificationProvider;
use App\Services\Identity\Contracts\MobileOwnershipVerificationProvider;
use App\Services\Identity\Contracts\PersonInfoVerificationProvider;
use App\Services\Identity\DTOs\MobileOwnershipVerificationResult;
use App\Services\Identity\DTOs\PersonInfoResult;
use App\Services\Identity\DTOs\ProviderConnectionResult;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Throwable;

/**
 * API.ir Shahkar adapter — Authorization: Bearer only (per s.api.ir docs).
 *
 * Covers three sw1 endpoints:
 *  - ShahkarLite: mobile ↔ national code match
 *  - PersonInfo: national code + birth date → civil registry identity
 *  - CardMatch: card number ↔ national code + birth date match
 *
 * @see https://s.api.ir
 */
class ApiIrShahkarProvider implements
    MobileOwnershipVerificationProvider,
    FinancialOwnershipVerificationProvider,
    PersonInfoVerificationProvider
{
    public const SLUG = 'api-ir-shahkar';

    public const DEFAULT_BASE_URL = 'https://s.api.ir';

    public function slug(): string
    {
        return self::SLUG;
    }

    /** @return list<IdentityCapability> */
    public function capabilities(): array
    {
        return [
            IdentityCapability::MobileNationalCodeMatch,
            IdentityCapability::CardNationalCodeMatch,
            IdentityCapability::PersonInfoInquiry,
        ];
    }

    public function isConfigured(): bool
    {
        $config = $this->config();
        if (! $config || ! $config->is_enabled) {
            return false;
        }

        return filled($this->resolveToken($config));
    }

    public function testConnection(): ProviderConnectionResult
    {
        if (! $this->isConfigured()) {
            return ProviderConnectionResult::configurationIncomplete(
                'توکن Bearer برای سرویس API.ir شاهکار تنظیم نشده است.'
            );
        }

        $config = $this->config();
        $baseUrl = $this->baseUrl($config);

        try {
            $response = $this->client($config)->get($baseUrl.'/');

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

    /*
    |--------------------------------------------------------------------------
    | ShahkarLite — mobile ↔ national code
    |--------------------------------------------------------------------------
    */

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
        $path = (string) ($config->settings['shahkar_path'] ?? '/api/sw1/ShahkarLite');

        [$json, $duration, $requestId, $failure] = $this->post($config, $path, [
            'nationalCode' => $nationalCode,
            'mobile' => $mobile,
        ], $started);

        if ($failure) {
            return $failure;
        }

        return $this->normalizeBoolean($json, $duration, $requestId);
    }

    /*
    |--------------------------------------------------------------------------
    | PersonInfo — national code + birth date → identity
    |--------------------------------------------------------------------------
    */

    public function lookup(string $nationalCode, string $birthDate): PersonInfoResult
    {
        $started = hrtime(true);

        if (! $this->isConfigured()) {
            return new PersonInfoResult(
                OwnershipVerificationResult::ProviderError,
                provider_code: 'not_configured',
                provider_message: 'سرویس API.ir شاهکار پیکربندی نشده است.',
                duration_ms: $this->elapsedMs($started),
            );
        }

        $config = $this->config();
        $path = (string) ($config->settings['person_info_path'] ?? '/api/sw1/PersonInfo');

        [$json, $duration, $requestId, $failure] = $this->post($config, $path, [
            'nationalCode' => $nationalCode,
            'birthDate' => $birthDate,
        ], $started);

        if ($failure) {
            return new PersonInfoResult(
                $failure->normalized_result,
                provider_code: $failure->provider_code,
                provider_message: $failure->provider_message,
                provider_request_id: $failure->provider_request_id,
                duration_ms: $failure->duration_ms,
            );
        }

        $data = data_get($json, 'data');

        if (! is_array($data) || $data === []) {
            return new PersonInfoResult(
                OwnershipVerificationResult::Mismatched,
                provider_code: '0',
                provider_message: is_string(data_get($json, 'message')) ? $json['message'] : 'اطلاعاتی برای این کد ملی یافت نشد.',
                provider_request_id: $requestId,
                duration_ms: $duration,
            );
        }

        $genderRaw = data_get($data, 'gender');
        $gender = match (true) {
            $genderRaw === 1 || $genderRaw === '1' => 'male',
            $genderRaw === 0 || $genderRaw === '0' => 'female',
            default => null,
        };

        return new PersonInfoResult(
            OwnershipVerificationResult::Matched,
            first_name: is_string(data_get($data, 'firstName')) ? $data['firstName'] : null,
            last_name: is_string(data_get($data, 'lastName')) ? $data['lastName'] : null,
            father_name: is_string(data_get($data, 'fatherName')) ? $data['fatherName'] : null,
            gender: $gender,
            alive: is_bool(data_get($data, 'alive')) ? $data['alive'] : null,
            provider_request_id: $requestId,
            duration_ms: $duration,
        );
    }

    /*
    |--------------------------------------------------------------------------
    | CardMatch — card ↔ national code + birth date
    |--------------------------------------------------------------------------
    */

    public function verifyCard(string $cardNumber, string $nationalCode, string $birthDate): MobileOwnershipVerificationResult
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
        $path = (string) ($config->settings['card_match_path'] ?? '/api/sw1/CardMatch');

        [$json, $duration, $requestId, $failure] = $this->post($config, $path, [
            'nationalCode' => $nationalCode,
            'birthDate' => $birthDate,
            'cardNumber' => $cardNumber,
        ], $started);

        if ($failure) {
            return $failure;
        }

        return $this->normalizeBoolean($json, $duration, $requestId);
    }

    public function verifyIban(string $iban, string $nationalCode, string $birthDate): MobileOwnershipVerificationResult
    {
        // api.ir does not expose an IBAN↔national-code product; IBAN ownership
        // stays routed to the U-ID financial provider.
        return new MobileOwnershipVerificationResult(
            OwnershipVerificationResult::ProviderError,
            'unsupported',
            'تطبیق شبا در سرویس API.ir پشتیبانی نمی‌شود.',
            null,
            0,
        );
    }

    public function inquireCard(string $cardNumber): ?array
    {
        // api.ir CardMatch only returns a boolean match — no IBAN/bank enrichment.
        return null;
    }

    /*
    |--------------------------------------------------------------------------
    | Shared helpers
    |--------------------------------------------------------------------------
    */

    private function client(IdentityProviderConfig $config): PendingRequest
    {
        $settings = $config->settings ?? [];

        return \Illuminate\Support\Facades\Http::timeout((int) ($settings['timeout'] ?? 20))
            ->withToken($this->resolveToken($config))
            ->acceptJson()
            ->asJson();
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{0: array<string, mixed>, 1: int, 2: ?string, 3: ?MobileOwnershipVerificationResult}
     */
    private function post(IdentityProviderConfig $config, string $path, array $payload, int $started): array
    {
        $baseUrl = $this->baseUrl($config);

        try {
            $response = $this->client($config)->post($baseUrl.$path, $payload);

            $duration = $this->elapsedMs($started);
            $json = $response->json() ?? [];
            $requestId = data_get($json, 'track_id')
                ?? data_get($json, 'requestId')
                ?? $response->header('X-Request-Id');
            $requestId = is_string($requestId) ? $requestId : null;

            if (in_array($response->status(), [401, 403], true)) {
                return [[], $duration, $requestId, new MobileOwnershipVerificationResult(
                    OwnershipVerificationResult::Unauthorized,
                    (string) $response->status(),
                    'دسترسی به سرویس API.ir مجاز نیست.',
                    $requestId,
                    $duration,
                )];
            }

            if ($response->status() === 429) {
                return [[], $duration, $requestId, new MobileOwnershipVerificationResult(
                    OwnershipVerificationResult::RateLimited,
                    '429',
                    'محدودیت نرخ درخواست سرویس API.ir.',
                    $requestId,
                    $duration,
                )];
            }

            if ($response->serverError()) {
                return [[], $duration, $requestId, new MobileOwnershipVerificationResult(
                    OwnershipVerificationResult::TechnicalError,
                    (string) $response->status(),
                    'خطای فنی سرویس API.ir.',
                    $requestId,
                    $duration,
                )];
            }

            return [$json, $duration, $requestId, null];
        } catch (ConnectionException) {
            return [[], $this->elapsedMs($started), null, new MobileOwnershipVerificationResult(
                OwnershipVerificationResult::TechnicalError,
                'connection_error',
                'ارتباط با سرویس API.ir برقرار نشد.',
                null,
                $this->elapsedMs($started),
            )];
        } catch (Throwable) {
            return [[], $this->elapsedMs($started), null, new MobileOwnershipVerificationResult(
                OwnershipVerificationResult::ProviderError,
                'unexpected',
                'پاسخ سرویس API.ir قابل پردازش نبود.',
                null,
                $this->elapsedMs($started),
            )];
        }
    }

    /**
     * @param  array<string, mixed>  $json
     */
    private function normalizeBoolean(array $json, int $duration, ?string $requestId): MobileOwnershipVerificationResult
    {
        $matched = data_get($json, 'data');

        if (is_bool($matched)) {
            return new MobileOwnershipVerificationResult(
                $matched ? OwnershipVerificationResult::Matched : OwnershipVerificationResult::Mismatched,
                is_string(data_get($json, 'code')) || is_numeric(data_get($json, 'code')) ? (string) $json['code'] : null,
                is_string(data_get($json, 'message')) ? $json['message'] : null,
                $requestId,
                $duration,
            );
        }

        return new MobileOwnershipVerificationResult(
            OwnershipVerificationResult::ProviderError,
            'unknown_shape',
            is_string(data_get($json, 'message')) ? $json['message'] : 'ساختار پاسخ سرویس API.ir شناسایی نشد.',
            $requestId,
            $duration,
        );
    }

    private function config(): ?IdentityProviderConfig
    {
        return IdentityProviderConfig::query()->where('slug', self::SLUG)->first();
    }

    private function baseUrl(IdentityProviderConfig $config): string
    {
        $configured = trim((string) ($config->settings['base_url'] ?? ''));

        return rtrim($configured !== '' ? $configured : self::DEFAULT_BASE_URL, '/');
    }

    /**
     * Raw Bearer token only — strips a pasted "Bearer " prefix and accepts legacy api_key.
     */
    private function resolveToken(IdentityProviderConfig $config): string
    {
        $credentials = $config->getCredentials();
        $raw = (string) ($credentials['api_token'] ?? $credentials['api_key'] ?? '');
        $raw = trim($raw);

        if ($raw !== '' && preg_match('/^Bearer\s+/i', $raw) === 1) {
            $raw = trim((string) preg_replace('/^Bearer\s+/i', '', $raw));
        }

        return $raw;
    }

    private function elapsedMs(int $started): int
    {
        return (int) max(0, (hrtime(true) - $started) / 1_000_000);
    }
}
