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
        $shahkarPath = (string) ($config->settings['shahkar_path'] ?? '/api/sw1/ShahkarLite');
        $personPath = (string) ($config->settings['person_info_path'] ?? '/api/sw1/PersonInfo');

        try {
            // Probe BOTH endpoints with official API.ir sample payloads (not real users).
            // Real submit always sends the student's own nationalCode / mobile / birthDate.
            $shahkar = $this->client($config)->post($baseUrl.$shahkarPath, [
                'nationalCode' => '0010007700',
                'mobile' => '09120000000',
            ]);

            if (in_array($shahkar->status(), [401, 403], true)) {
                return ProviderConnectionResult::invalidCredentials(
                    'توکن API.ir نامعتبر است (Authorization: Bearer). فقط توکن خام را ذخیره کنید، نه کلمه Bearer.'
                );
            }

            $person = $this->client($config)->post($baseUrl.$personPath, [
                'nationalCode' => '0010007700',
                'birthDate' => '1371/1/1',
            ]);

            if (in_array($person->status(), [401, 403], true)) {
                return ProviderConnectionResult::invalidCredentials(
                    'توکن برای ShahkarLite قبول شد ولی برای PersonInfo مجاز نیست (احتمالاً trust level). توکن/مجوز استعلام مشخصات هویتی را در پنل API.ir بررسی کنید.'
                );
            }

            $personJson = $this->decodeJsonBody($person);
            $personOk = is_array(data_get($personJson, 'data'))
                || array_key_exists('success', $personJson)
                || $person->successful();

            if (! $personOk && $person->serverError()) {
                return ProviderConnectionResult::providerUnavailable(
                    'ShahkarLite در دسترس است ولی PersonInfo خطای سرور داد (HTTP '.$person->status().').'
                );
            }

            return ProviderConnectionResult::connected(
                'اتصال API.ir برقرار است (ShahkarLite + PersonInfo). دادهٔ نمونه فقط برای تست است؛ احراز هویت واقعی با کدملی/موبایل/تاریخ‌تولد خود کاربر ارسال می‌شود.'
            );
        } catch (ConnectionException $e) {
            $detail = trim($e->getMessage());
            $hint = 'ارتباط با سرویس API.ir برقرار نشد. سرور باید به https://s.api.ir دسترسی HTTPS داشته باشد (DNS/فایروال/فیلتر).';
            if ($detail !== '') {
                $hint .= ' جزئیات: '.$detail;
            }

            return ProviderConnectionResult::providerUnavailable($hint);
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

        // Exact PersonInfoReq shape from s.api.ir docs:
        // POST /api/sw1/PersonInfo { "nationalCode": "...", "birthDate": "1371/1/1" }
        $payload = [
            'nationalCode' => (string) $nationalCode,
            'birthDate' => $this->normalizePersonInfoBirthDate($birthDate),
        ];

        [$json, $duration, $requestId, $failure] = $this->post($config, $path, $payload, $started);

        if ($failure) {
            return new PersonInfoResult(
                $failure->normalized_result,
                provider_code: $failure->provider_code,
                provider_message: $failure->provider_message,
                provider_request_id: $failure->provider_request_id,
                duration_ms: $failure->duration_ms,
            );
        }

        return $this->normalizePersonInfo($json, $duration, $requestId);
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
            $json = $this->decodeJsonBody($response);
            $requestId = data_get($json, 'track_id')
                ?? data_get($json, 'requestId')
                ?? $response->header('X-Request-Id');
            $requestId = is_string($requestId) ? $requestId : null;

            if (in_array($response->status(), [401, 403], true)) {
                $message = is_string(data_get($json, 'message')) && filled($json['message'])
                    ? (string) $json['message']
                    : 'دسترسی به سرویس API.ir مجاز نیست.';

                return [[], $duration, $requestId, new MobileOwnershipVerificationResult(
                    OwnershipVerificationResult::Unauthorized,
                    (string) $response->status(),
                    $message,
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
                    is_string(data_get($json, 'message')) && filled($json['message'])
                        ? (string) $json['message']
                        : 'خطای فنی سرویس API.ir.',
                    $requestId,
                    $duration,
                )];
            }

            // Client errors (e.g. 400 validation) — keep body for PersonInfo/Shahkar parsers.
            if ($response->clientError()) {
                $message = is_string(data_get($json, 'message')) && filled($json['message'])
                    ? (string) $json['message']
                    : 'درخواست استعلام API.ir نامعتبر بود (HTTP '.$response->status().').';

                return [[], $duration, $requestId, new MobileOwnershipVerificationResult(
                    OwnershipVerificationResult::ProviderError,
                    (string) $response->status(),
                    $message,
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
     * @param  array<string, mixed>  $json  ResultDataOfPersonInfoRes
     */
    private function normalizePersonInfo(array $json, int $duration, ?string $requestId): PersonInfoResult
    {
        $data = data_get($json, 'data');
        $message = is_string(data_get($json, 'message')) ? $json['message'] : null;
        $code = is_string(data_get($json, 'code')) || is_numeric(data_get($json, 'code'))
            ? (string) $json['code']
            : null;

        if (is_array($data) && $data !== []) {
            $firstName = $this->stringField($data, ['firstName', 'first_name']);
            $lastName = $this->stringField($data, ['lastName', 'last_name']);
            $fatherName = $this->stringField($data, ['fatherName', 'father_name']);
            $genderRaw = data_get($data, 'gender');
            $gender = match (true) {
                $genderRaw === 1 || $genderRaw === '1' => 'male',
                $genderRaw === 0 || $genderRaw === '0' => 'female',
                default => null,
            };
            $aliveRaw = data_get($data, 'alive');
            $alive = is_bool($aliveRaw) ? $aliveRaw : null;

            // API.ir often sets success=false even on successful data payloads (same as ShahkarLite).
            if (filled($firstName) || filled($lastName) || filled($fatherName) || $gender !== null || $alive !== null) {
                return new PersonInfoResult(
                    OwnershipVerificationResult::Matched,
                    first_name: $firstName,
                    last_name: $lastName,
                    father_name: $fatherName,
                    gender: $gender,
                    alive: $alive,
                    provider_code: $code,
                    provider_message: $message,
                    provider_request_id: $requestId,
                    duration_ms: $duration,
                );
            }
        }

        $combined = mb_strtolower(trim((string) ($message ?? '')));
        if ($this->looksLikeProviderPermissionError($combined, $code)) {
            return new PersonInfoResult(
                OwnershipVerificationResult::ProviderError,
                provider_code: $code ?: 'permission',
                provider_message: $message ?: 'مجوز یا اعتبار استعلام مشخصات هویتی (PersonInfo) کافی نیست.',
                provider_request_id: $requestId,
                duration_ms: $duration,
            );
        }

        return new PersonInfoResult(
            OwnershipVerificationResult::Mismatched,
            provider_code: $code ?: '0',
            provider_message: $message ?: 'اطلاعاتی برای این کد ملی یافت نشد.',
            provider_request_id: $requestId,
            duration_ms: $duration,
        );
    }

    /** Official api.ir birthDate: Latin digits, unpadded Jalali Y/M/D (e.g. 1371/1/1). */
    private function normalizePersonInfoBirthDate(string $birthDate): string
    {
        return \App\Support\JalaliDate::formatApiFromDateString($birthDate);
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  list<string>  $keys
     */
    private function stringField(array $data, array $keys): ?string
    {
        foreach ($keys as $key) {
            $value = data_get($data, $key);
            if (is_string($value) && trim($value) !== '') {
                return trim($value);
            }
        }

        return null;
    }

    private function looksLikeProviderPermissionError(string $messageLower, ?string $code): bool
    {
        if (in_array($code, ['401', '403', '402', 'payment', 'permission'], true)) {
            return true;
        }

        foreach (['trust', 'مجوز', 'اعتبار', 'دسترسی', 'سطح', 'غیرفعال', 'wallet', 'موجودی'] as $needle) {
            if ($needle !== '' && str_contains($messageLower, $needle)) {
                return true;
            }
        }

        return false;
    }

    /**
     * API.ir PersonInfo docs advertise text/plain responses — decode body even when
     * Content-Type is not application/json.
     *
     * @return array<string, mixed>
     */
    private function decodeJsonBody(\Illuminate\Http\Client\Response $response): array
    {
        $json = $response->json();
        if (is_array($json)) {
            return $json;
        }

        $decoded = json_decode($response->body(), true);

        return is_array($decoded) ? $decoded : [];
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
        $normalized = $this->normalizeBaseUrl($configured);

        // Heal common typos persisted in admin settings (e.g. s.apif.ir).
        if ($configured !== '' && $configured !== $normalized) {
            $settings = $config->settings ?? [];
            $settings['base_url'] = $normalized;
            $config->settings = $settings;
            $config->saveQuietly();
        }

        return $normalized;
    }

    private function normalizeBaseUrl(string $configured): string
    {
        $url = rtrim($configured !== '' ? $configured : self::DEFAULT_BASE_URL, '/');
        $url = preg_replace('#^http://#i', 'https://', $url) ?? $url;
        // Typo seen in production: s.apif.ir instead of s.api.ir
        $url = str_ireplace(['s.apif.ir', '://apif.ir'], ['s.api.ir', '://api.ir'], $url);

        $host = parse_url($url, PHP_URL_HOST);
        if (! is_string($host) || ! preg_match('/(^|\.)api\.ir$/i', $host)) {
            return self::DEFAULT_BASE_URL;
        }

        return rtrim($url, '/');
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
