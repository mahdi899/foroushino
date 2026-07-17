<?php

namespace App\Modules\TelegramBot\Http\Controllers\Admin;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Http\Controllers\Admin\Concerns\AuthorizesTelegramAdmin;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Repositories\TelegramBotRepository;
use App\Modules\TelegramBot\Services\BotResolver;
use App\Modules\TelegramBot\Services\HealthCheckService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TelegramBotAdminController
{
    use AuthorizesTelegramAdmin;

    public function __construct(
        private readonly TelegramBotRepository $bots,
        private readonly HealthCheckService $health,
        private readonly BotResolver $resolver,
        private readonly TelegramBotClientFactory $clients,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.view');

        $health = $this->health->run();

        return response()->json([
            'data' => $this->bots->all()->map(fn (TelegramBot $bot) => $this->payload($bot, $health['bots'][$bot->key] ?? null))->values(),
        ]);
    }

    public function show(Request $request, TelegramBot $bot): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.view');

        $health = $this->health->run();

        return response()->json([
            'data' => $this->payload($bot, $health['bots'][$bot->key] ?? null, detailed: true),
        ]);
    }

    public function update(Request $request, TelegramBot $bot): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.settings.manage');

        $data = $request->validate([
            'is_active' => ['sometimes', 'boolean'],
            'support_group_chat_id' => ['sometimes', 'nullable', 'string', 'max:64'],
            'reports_chat_id' => ['sometimes', 'nullable', 'string', 'max:64'],
            'reports_topic_id' => ['sometimes', 'nullable', 'integer'],
            'settings' => ['sometimes', 'nullable', 'array'],
        ]);

        $bot->update($data);

        return response()->json(['data' => $this->payload($bot->fresh(), null, detailed: true)]);
    }

    public function syncFromConfig(Request $request): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.settings.manage');

        $this->resolver->syncAllFromConfig();

        return $this->index($request);
    }

    public function setWebhook(Request $request, TelegramBot $bot): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.settings.manage');

        $base = rtrim((string) config('telegram_bot.webhook.base_url'), '/');
        $path = str_replace('{botKey}', $bot->key, (string) config('telegram_bot.webhook.path_pattern'));
        $url = $base.'/'.$path;

        $this->clients->forBot($bot)->setWebhook($url, $bot->webhook_secret);

        return response()->json(['data' => ['ok' => true, 'url' => $url]]);
    }

    public function deleteWebhook(Request $request, TelegramBot $bot): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.settings.manage');

        $this->clients->forBot($bot)->deleteWebhook();

        return response()->json(['data' => ['ok' => true]]);
    }

    public function webhookInfo(Request $request, TelegramBot $bot): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.view');

        if (! $bot->exists) {
            $bot = TelegramBot::query()->findOrFail((int) $request->route('bot'));
        }

        return response()->json([
            'data' => $this->clients->forBot($bot)->getWebhookInfo(),
        ]);
    }

    public function profile(Request $request, TelegramBot $bot): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.view');

        if (! $bot->exists) {
            $bot = TelegramBot::query()->findOrFail((int) $request->route('bot'));
        }

        $client = $this->clients->forBot($bot);
        $telegram = [
            'name' => $bot->display_name,
            'description' => null,
            'short_description' => null,
            'username' => $bot->username,
            'has_profile_photo' => false,
            'profile_photo_data_url' => null,
        ];

        try {
            $telegram['name'] = data_get($client->getMyName(), 'name') ?: $bot->display_name;
            $telegram['description'] = data_get($client->getMyDescription(), 'description');
            $telegram['short_description'] = data_get($client->getMyShortDescription(), 'short_description');
        } catch (\Throwable) {
            // Keep DB fallbacks when Telegram profile APIs are unreachable.
        }

        try {
            $me = $client->getMe();
            $botUserId = (int) ($me['id'] ?? 0);
            if ($botUserId > 0) {
                $photos = $client->getUserProfilePhotos($botUserId, 0, 1);
                $sizes = data_get($photos, 'photos.0');
                if (is_array($sizes) && $sizes !== []) {
                    $largest = $sizes[array_key_last($sizes)] ?? null;
                    $fileId = is_array($largest) ? ($largest['file_id'] ?? null) : null;
                    if (is_string($fileId) && $fileId !== '') {
                        $file = $client->getFile($fileId);
                        $filePath = $file['file_path'] ?? null;
                        if (is_string($filePath) && $filePath !== '') {
                            $bytes = $client->downloadFile($filePath);
                            if ($bytes !== '') {
                                $telegram['has_profile_photo'] = true;
                                $telegram['profile_photo_data_url'] = 'data:image/jpeg;base64,'.base64_encode($bytes);
                            }
                        }
                    }
                }
            }
        } catch (\Throwable) {
            // Photo preview is best-effort.
        }

        return response()->json([
            'data' => [
                'bot' => $this->payload($bot, null, detailed: true),
                'telegram' => $telegram,
            ],
        ]);
    }

    public function updateProfile(Request $request, TelegramBot $bot): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.settings.manage');

        if (! $bot->exists) {
            $bot = TelegramBot::query()->findOrFail((int) $request->route('bot'));
        }

        if ($missingToken = $this->missingBotTokenResponse($bot)) {
            return $missingToken;
        }

        $data = $request->validate([
            'name' => ['sometimes', 'nullable', 'string', 'max:64'],
            'description' => ['sometimes', 'nullable', 'string', 'max:512'],
            'short_description' => ['sometimes', 'nullable', 'string', 'max:120'],
            'display_name' => ['sometimes', 'nullable', 'string', 'max:120'],
        ]);

        $client = $this->clients->forBot($bot);

        try {
            if (array_key_exists('name', $data) && filled($data['name'])) {
                $client->setMyName((string) $data['name']);
                $bot->update(['display_name' => (string) $data['name']]);
            } elseif (array_key_exists('display_name', $data) && filled($data['display_name'])) {
                $client->setMyName((string) $data['display_name']);
                $bot->update(['display_name' => (string) $data['display_name']]);
            }

            if (array_key_exists('description', $data)) {
                $client->setMyDescription($data['description']);
            }

            if (array_key_exists('short_description', $data)) {
                $client->setMyShortDescription($data['short_description']);
            }
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'code' => 'telegram_profile_update_failed',
                    'message_fa' => 'به‌روزرسانی پروفایل در تلگرام ناموفق بود: '.$e->getMessage(),
                ],
            ], 422);
        }

        return $this->profile($request, $bot->fresh());
    }

    public function updateProfilePhoto(Request $request, TelegramBot $bot): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.settings.manage');

        if (! $bot->exists) {
            $bot = TelegramBot::query()->findOrFail((int) $request->route('bot'));
        }

        if ($missingToken = $this->missingBotTokenResponse($bot)) {
            return $missingToken;
        }

        $request->validate([
            'photo' => ['required', 'file', 'image', 'max:5120', 'mimes:jpg,jpeg,png,webp'],
        ]);

        $uploaded = $request->file('photo');
        $jpgPath = null;

        try {
            $jpgPath = $this->materializeStaticProfileJpeg($uploaded->getRealPath());
            $this->clients->forBot($bot)->setMyProfilePhoto($jpgPath);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => [
                    'code' => 'telegram_profile_photo_invalid',
                    'message_fa' => $e->getMessage(),
                ],
            ], 422);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'code' => 'telegram_profile_photo_update_failed',
                    'message_fa' => 'آپلود عکس پروفایل در تلگرام ناموفق بود: '.$e->getMessage(),
                ],
            ], 422);
        } finally {
            if (is_string($jpgPath) && is_file($jpgPath)) {
                @unlink($jpgPath);
            }
        }

        return $this->profile($request, $bot->fresh());
    }

    public function removeProfilePhoto(Request $request, TelegramBot $bot): JsonResponse
    {
        $this->authorizeTelegram($request, 'telegram.settings.manage');

        if (! $bot->exists) {
            $bot = TelegramBot::query()->findOrFail((int) $request->route('bot'));
        }

        if ($missingToken = $this->missingBotTokenResponse($bot)) {
            return $missingToken;
        }

        try {
            $this->clients->forBot($bot)->removeMyProfilePhoto();
        } catch (\Throwable $e) {
            return response()->json([
                'error' => [
                    'code' => 'telegram_profile_photo_remove_failed',
                    'message_fa' => 'حذف عکس پروفایل در تلگرام ناموفق بود: '.$e->getMessage(),
                ],
            ], 422);
        }

        return $this->profile($request, $bot->fresh());
    }

    /**
     * Telegram accepts only square .JPG profile photos. Always normalize uploads.
     *
     * @return string Absolute path to a temporary JPEG file (caller must delete)
     */
    private function materializeStaticProfileJpeg(string $sourcePath): string
    {
        if (! function_exists('imagecreatefromstring') || ! function_exists('imagejpeg')) {
            throw new \InvalidArgumentException('برای پردازش تصویر، افزونه GD روی سرور لازم است.');
        }

        $raw = file_get_contents($sourcePath);
        if ($raw === false) {
            throw new \InvalidArgumentException('خواندن فایل تصویر ناموفق بود.');
        }

        $image = @imagecreatefromstring($raw);
        if ($image === false) {
            throw new \InvalidArgumentException('فرمت تصویر پشتیبانی نمی‌شود. JPG، PNG یا WebP آپلود کنید.');
        }

        if (function_exists('imagepalettetotruecolor')) {
            @imagepalettetotruecolor($image);
        }

        $width = imagesx($image);
        $height = imagesy($image);
        if ($width < 1 || $height < 1) {
            imagedestroy($image);
            throw new \InvalidArgumentException('ابعاد تصویر نامعتبر است.');
        }

        $cropSize = min($width, $height);
        $srcX = (int) floor(($width - $cropSize) / 2);
        $srcY = (int) floor(($height - $cropSize) / 2);

        $square = imagecreatetruecolor($cropSize, $cropSize);
        if ($square === false) {
            imagedestroy($image);
            throw new \InvalidArgumentException('پردازش تصویر ناموفق بود.');
        }

        imagecopyresampled($square, $image, 0, 0, $srcX, $srcY, $cropSize, $cropSize, $cropSize, $cropSize);
        imagedestroy($image);

        $targetSize = min(640, max(320, $cropSize));
        if ($targetSize !== $cropSize) {
            $resized = imagecreatetruecolor($targetSize, $targetSize);
            if ($resized === false) {
                imagedestroy($square);
                throw new \InvalidArgumentException('تغییر اندازه تصویر ناموفق بود.');
            }

            imagecopyresampled($resized, $square, 0, 0, 0, 0, $targetSize, $targetSize, $cropSize, $cropSize);
            imagedestroy($square);
            $square = $resized;
        }

        $tmp = tempnam(sys_get_temp_dir(), 'tg_bot_avatar_');
        if ($tmp === false) {
            imagedestroy($square);
            throw new \InvalidArgumentException('ایجاد فایل موقت ناموفق بود.');
        }

        $jpgPath = $tmp.'.jpg';
        @unlink($tmp);

        $ok = imagejpeg($square, $jpgPath, 92);
        imagedestroy($square);

        if (! $ok || ! is_file($jpgPath)) {
            throw new \InvalidArgumentException('تبدیل تصویر به JPG ناموفق بود.');
        }

        return $jpgPath;
    }

    private function missingBotTokenResponse(TelegramBot $bot): ?JsonResponse
    {
        if (filled($bot->resolveToken())) {
            return null;
        }

        $envVar = $bot->token_key ?: 'TELEGRAM_BOT_TOKEN';

        return response()->json([
            'error' => [
                'code' => 'telegram_bot_token_missing',
                'message_fa' => sprintf(
                    'توکن ربات «%s» (%s) در env تنظیم نشده. مقدار %s را در فایل bahram-cm/backend/.env قرار دهید، یا پروفایل ربات production را ویرایش کنید.',
                    $bot->display_name,
                    $bot->key,
                    $envVar,
                ),
            ],
        ], 422);
    }

    /** @param  array<string, mixed>|null  $healthBot */
    private function payload(TelegramBot $bot, ?array $healthBot, bool $detailed = false): array
    {
        $base = [
            'id' => $bot->id,
            'key' => $bot->key,
            'display_name' => $bot->display_name,
            'username' => $bot->username,
            'environment' => $bot->environment?->value ?? (string) $bot->environment,
            'is_active' => $bot->is_active,
            'token_present' => filled($bot->resolveToken()),
            'token_key' => $bot->token_key,
            'api_reachable' => (bool) ($healthBot['api_reachable'] ?? false),
            'webhook_url' => $healthBot['webhook_url'] ?? null,
        ];

        if (! $detailed) {
            return $base;
        }

        return array_merge($base, [
            'support_group_chat_id' => $bot->support_group_chat_id,
            'reports_chat_id' => $bot->reports_chat_id,
            'reports_topic_id' => $bot->reports_topic_id,
            'settings' => $bot->settings ?? [],
            'token_key' => $bot->token_key,
        ]);
    }
}
