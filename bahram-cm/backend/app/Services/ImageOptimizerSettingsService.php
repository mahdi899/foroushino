<?php

namespace App\Services;

use App\Models\Setting;
use App\Support\ResmushClient;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * TinyPNG (Tinify) + reSmush.it — panel-managed with .env fallback.
 */
class ImageOptimizerSettingsService
{
    public const GROUP = 'media';

    public const KEY = 'image_optimizer';

    private const CACHE_KEY = 'media.image_optimizer.config';

    public function __construct(private readonly SettingService $settings) {}

    /** @return array<string, mixed> */
    private function stored(): array
    {
        return Cache::remember(self::CACHE_KEY, 300, function () {
            $raw = Setting::query()
                ->where('group', self::GROUP)
                ->where('key', self::KEY)
                ->value('value');

            return is_array($raw) ? $raw : [];
        });
    }

    public static function forgetCachedConfig(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    public function tinifyKey(): ?string
    {
        $stored = trim((string) ($this->stored()['tinify_key'] ?? ''));
        if ($stored !== '') {
            return $stored;
        }

        $env = trim((string) config('bahram.image_optimizer.tinify_key', ''));

        return $env !== '' ? $env : null;
    }

    public function resmushEnabled(): bool
    {
        if (array_key_exists('resmush_enabled', $this->stored())) {
            return filter_var($this->stored()['resmush_enabled'], FILTER_VALIDATE_BOOL);
        }

        return filter_var(config('bahram.image_optimizer.resmush_enabled', true), FILTER_VALIDATE_BOOL);
    }

    public function resmushQuality(): int
    {
        if (isset($this->stored()['resmush_quality'])) {
            return max(0, min(100, (int) $this->stored()['resmush_quality']));
        }

        return (int) config('bahram.image_optimizer.resmush_quality', 85);
    }

    public function resmushReferer(): string
    {
        $stored = trim((string) ($this->stored()['resmush_referer'] ?? ''));
        if ($stored !== '') {
            return $stored;
        }

        return (string) config('bahram.image_optimizer.resmush_referer', config('bahram.frontend_url', 'http://localhost:3000'));
    }

    public function resmushUserAgent(): string
    {
        $stored = trim((string) ($this->stored()['resmush_user_agent'] ?? ''));
        if ($stored !== '') {
            return $stored;
        }

        return (string) config('bahram.image_optimizer.resmush_user_agent', 'BahramRostami/1.0');
    }

    public function resmushClient(): ResmushClient
    {
        return new ResmushClient(
            quality: $this->resmushQuality(),
            userAgent: $this->resmushUserAgent(),
            referer: $this->resmushReferer(),
        );
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

    /** Admin-safe view (no raw secrets). */
    public function adminView(): array
    {
        $stored = $this->stored();
        $panelKey = trim((string) ($stored['tinify_key'] ?? ''));
        $envKey = trim((string) config('bahram.image_optimizer.tinify_key', ''));

        return [
            'has_tinify_key' => (bool) $this->tinifyKey(),
            'tinify_key_preview' => $this->tinifyKey() ? $this->maskSecret($this->tinifyKey()) : null,
            'tinify_configured' => (bool) $this->tinifyKey(),
            'resmush_enabled' => $this->resmushEnabled(),
            'resmush_quality' => $this->resmushQuality(),
            'resmush_referer' => $this->resmushReferer(),
            'resmush_configured' => $this->resmushEnabled(),
            'env_fallback' => [
                'tinify_key' => $envKey !== '' && $panelKey === '',
                'resmush_referer' => empty($stored['resmush_referer']),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function update(array $input): array
    {
        $current = $this->stored();
        $next = $current;

        if (array_key_exists('tinify_key_input', $input)) {
            $key = trim((string) $input['tinify_key_input']);
            if ($key !== '') {
                $next['tinify_key'] = $key;
            }
        }

        if (array_key_exists('resmush_enabled', $input)) {
            $next['resmush_enabled'] = filter_var($input['resmush_enabled'], FILTER_VALIDATE_BOOL);
        }

        if (array_key_exists('resmush_quality', $input)) {
            $next['resmush_quality'] = max(0, min(100, (int) $input['resmush_quality']));
        }

        if (array_key_exists('resmush_referer', $input)) {
            $next['resmush_referer'] = trim((string) $input['resmush_referer']);
        }

        $this->settings->updateGroup(self::GROUP, [self::KEY => $next]);
        self::forgetCachedConfig();

        return $this->adminView();
    }

    /** @return array{ok: bool, message: string} */
    public function testTinify(): array
    {
        $key = $this->tinifyKey();
        if (! $key) {
            return ['ok' => false, 'message' => 'کلید API TinyPNG تنظیم نشده است. از tinypng.com/developers دریافت کنید.'];
        }

        try {
            \Tinify\setKey($key);
            \Tinify\validate();

            return ['ok' => true, 'message' => 'کلید TinyPNG معتبر است.'];
        } catch (\Throwable $e) {
            Log::warning('TinyPNG test failed', ['error' => $e->getMessage()]);

            return ['ok' => false, 'message' => 'TinyPNG: '.$e->getMessage()];
        }
    }

    /** @return array{ok: bool, message: string} */
    public function testResmush(): array
    {
        if (! $this->resmushEnabled()) {
            return ['ok' => false, 'message' => 'reSmush.it در تنظیمات غیرفعال است.'];
        }

        $tempDir = storage_path('app/temp');
        if (! is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $tempPath = $tempDir.'/resmush-test-'.uniqid('', true).'.png';
        $image = @imagecreatetruecolor(32, 32);
        if (! $image) {
            return ['ok' => false, 'message' => 'GD برای تست در دسترس نیست.'];
        }

        $blue = imagecolorallocate($image, 30, 100, 200);
        imagefill($image, 0, 0, $blue);
        imagepng($image, $tempPath, 6);
        imagedestroy($image);

        try {
            $out = $this->resmushClient()->compressToTemp($tempPath);
            $srcSize = filesize($tempPath) ?: 0;
            $outSize = filesize($out) ?: 0;
            @unlink($out);

            return [
                'ok' => true,
                'message' => 'reSmush.it پاسخ داد — تست '.$srcSize.'B → '.$outSize.'B (بدون کلید API).',
            ];
        } catch (\Throwable $e) {
            Log::warning('reSmush.it test failed', ['error' => $e->getMessage()]);

            return ['ok' => false, 'message' => 'reSmush.it: '.$e->getMessage()];
        } finally {
            if (is_file($tempPath)) {
                @unlink($tempPath);
            }
        }
    }
}
