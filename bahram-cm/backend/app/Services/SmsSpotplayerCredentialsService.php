<?php

namespace App\Services;

use App\Models\SmsProvider;
use App\Models\SmsSetting;
use App\Models\SpotplayerSetting;
use App\Services\Sms\SmsProviderFactory;

/**
 * Site settings: SMS provider credentials + SpotPlayer API key.
 * Operational routing (fallback, events) lives in the SMS center.
 */
class SmsSpotplayerCredentialsService
{
    /** @return array<string, mixed> */
    public function adminView(): array
    {
        $sms = SmsSetting::current();
        $spot = SpotplayerSetting::current();
        $credentials = $this->parseMelipayamakCredentials((string) $sms->sms_api_key);
        $providers = SmsProvider::query()->orderBy('sort_order')->get();

        return [
            'melipayamak_username' => $credentials['username'],
            'has_melipayamak_password' => filled($credentials['password']),
            'melipayamak_configured' => filled($credentials['username']) && filled($credentials['password']),
            'has_spotplayer_api_key' => filled($spot->spotplayer_api_key),
            'spotplayer_api_key_preview' => filled($spot->spotplayer_api_key)
                ? $this->maskSecret((string) $spot->spotplayer_api_key)
                : null,
            'spotplayer_configured' => filled($spot->spotplayer_api_key),
            'spotplayer_base_url' => $spot->spotplayer_base_url,
            'is_spotplayer_active' => (bool) $spot->is_spotplayer_active,
            'default_license_duration' => $spot->default_license_duration,
            'providers' => $providers->map(fn (SmsProvider $p) => [
                'slug' => $p->slug,
                'label_fa' => $p->label_fa,
                'sender_number' => $p->sender_number,
                'is_active' => $p->is_active,
                'configured' => $p->isReady(),
                'has_credentials' => filled($p->credentials),
                'credential_hint' => $this->credentialHint($p),
            ])->all(),
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function update(array $input): array
    {
        $sms = SmsSetting::current();
        $spot = SpotplayerSetting::current();
        $existing = $this->parseMelipayamakCredentials((string) $sms->sms_api_key);

        $username = array_key_exists('melipayamak_username', $input)
            ? trim((string) $input['melipayamak_username'])
            : $existing['username'];
        $passwordInput = array_key_exists('melipayamak_password_input', $input)
            ? trim((string) $input['melipayamak_password_input'])
            : '';
        $password = $passwordInput !== '' ? $passwordInput : $existing['password'];

        if ($username !== '' && $password !== '') {
            $sms->update([
                'sms_provider' => 'melipayamak',
                'sms_api_key' => $username.':'.$password,
            ]);
        }

        $melipayamak = SmsProvider::query()->firstOrCreate(
            ['slug' => 'melipayamak'],
            ['label_fa' => 'ملی‌پیامک', 'sort_order' => 1],
        );

        $melipayamakPatch = [];
        if ($username !== '' && $password !== '') {
            $melipayamakPatch['credentials'] = $username.':'.$password;
        }
        if (array_key_exists('melipayamak_sender_number', $input)) {
            $melipayamakPatch['sender_number'] = trim((string) $input['melipayamak_sender_number']) ?: null;
            $sms->update(['sms_sender_number' => $melipayamakPatch['sender_number']]);
        }
        if (array_key_exists('melipayamak_active', $input)) {
            $melipayamakPatch['is_active'] = (bool) $input['melipayamak_active'];
        }
        if ($melipayamakPatch !== []) {
            $melipayamak->update($melipayamakPatch);
        }

        $kavenegar = SmsProvider::query()->firstOrCreate(
            ['slug' => 'kavenegar'],
            ['label_fa' => 'کاوه‌نگار', 'sort_order' => 2],
        );

        $kavenegarPatch = [];
        if (array_key_exists('kavenegar_api_key_input', $input)) {
            $apiKey = trim((string) $input['kavenegar_api_key_input']);
            if ($apiKey !== '') {
                $kavenegarPatch['credentials'] = $apiKey;
            }
        }
        if (array_key_exists('kavenegar_sender_number', $input)) {
            $kavenegarPatch['sender_number'] = trim((string) $input['kavenegar_sender_number']) ?: null;
        }
        if (array_key_exists('kavenegar_active', $input)) {
            $kavenegarPatch['is_active'] = (bool) $input['kavenegar_active'];
        }
        if ($kavenegarPatch !== []) {
            $kavenegar->update($kavenegarPatch);
        }

        if (array_key_exists('spotplayer_api_key_input', $input)) {
            $spotKey = trim((string) $input['spotplayer_api_key_input']);
            if ($spotKey !== '') {
                $spot->update(['spotplayer_api_key' => $spotKey]);
            }
        }

        $spotPatch = [];
        if (array_key_exists('spotplayer_base_url', $input)) {
            $spotPatch['spotplayer_base_url'] = trim((string) $input['spotplayer_base_url']) ?: null;
        }
        if (array_key_exists('is_spotplayer_active', $input)) {
            $spotPatch['is_spotplayer_active'] = (bool) $input['is_spotplayer_active'];
        }
        if (array_key_exists('default_license_duration', $input)) {
            $duration = $input['default_license_duration'];
            $spotPatch['default_license_duration'] = $duration === null || $duration === ''
                ? null
                : max(0, (int) $duration);
        }
        if ($spotPatch !== []) {
            $spot->update($spotPatch);
        }

        return $this->adminView();
    }

    /** @return array{ok: bool, message: string} */
    public function testMelipayamak(): array
    {
        $result = app(SmsProviderFactory::class)->make('melipayamak')?->testConnection()
            ?? ['success' => false, 'message' => 'پنل ملی‌پیامک تنظیم نشده است.'];

        return ['ok' => $result['success'], 'message' => $result['message']];
    }

    /** @return array{ok: bool, message: string} */
    public function testKavenegar(): array
    {
        $result = app(SmsProviderFactory::class)->make('kavenegar')?->testConnection()
            ?? ['success' => false, 'message' => 'پنل کاوه‌نگار تنظیم نشده است.'];

        return ['ok' => $result['success'], 'message' => $result['message']];
    }

    /** @return array{ok: bool, message: string} */
    public function testSpotplayer(): array
    {
        $result = app(SpotPlayerService::class)->testConnection();

        return ['ok' => $result['success'], 'message' => $result['message']];
    }

    /** @return array{username: ?string, password: ?string} */
    private function parseMelipayamakCredentials(string $raw): array
    {
        if (blank($raw) || ! str_contains($raw, ':')) {
            return ['username' => null, 'password' => null];
        }

        [$username, $password] = explode(':', $raw, 2);

        return [
            'username' => filled($username) ? $username : null,
            'password' => filled($password) ? $password : null,
        ];
    }

    private function credentialHint(SmsProvider $provider): ?string
    {
        if (! filled($provider->credentials)) {
            return null;
        }

        if ($provider->slug === 'melipayamak') {
            $username = explode(':', (string) $provider->credentials, 2)[0] ?? '';

            return $username !== '' ? $username : 'ثبت‌شده';
        }

        $value = (string) $provider->credentials;

        return strlen($value) > 8 ? substr($value, 0, 6).'…' : 'ثبت‌شده';
    }

    private function maskSecret(string $value): string
    {
        $trimmed = trim($value);
        if ($trimmed === '') {
            return '';
        }
        if (strlen($trimmed) <= 8) {
            return '••••••••';
        }

        return substr($trimmed, 0, 7).'…'.substr($trimmed, -4);
    }
}
