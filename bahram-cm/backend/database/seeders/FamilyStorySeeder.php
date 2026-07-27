<?php

namespace Database\Seeders;

use App\Enums\Family\FamilyMediaStatus;
use App\Enums\Family\FamilyMediaType;
use App\Models\FamilyMedia;
use App\Models\FamilyStory;
use App\Models\User;
use App\Services\Family\FamilyMetaCacheService;
use App\Support\FamilyBlurPreview;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;

/**
 * استوری ۲۴ ساعتهٔ تصویری دمو — برای تست حلقهٔ پروفایل، LQIP بلور، و StoryViewer.
 * Idempotent: upsert روی media/family/demo/demo-story-vertical.webp
 */
class FamilyStorySeeder extends Seeder
{
    public const STORY_MEDIA_PATH = 'media/family/demo/demo-story-vertical.webp';

    public const STORY_PREVIEW_PATH = 'media/family/demo/demo-story-vertical_preview.webp';

    public const STORY_CAPTION = '📸 استوری تست — اول نسخهٔ بلور کوچک، بعد تصویر کامل.';

    public function run(): void
    {
        $author = User::query()
            ->where('email', 'admin@bahram.local')
            ->where('is_admin', true)
            ->first();

        if (! $author) {
            $this->command?->warn('کاربر admin@bahram.local یافت نشد — FamilyStorySeeder رد شد.');

            return;
        }

        $absolute = storage_path('app/public/'.self::STORY_MEDIA_PATH);
        $previewAbsolute = storage_path('app/public/'.self::STORY_PREVIEW_PATH);
        File::ensureDirectoryExists(dirname($absolute));

        if (! $this->ensureVerticalDemoImage($absolute)) {
            $this->command?->warn('ساخت تصویر استوری دمو ناموفق بود — FamilyStorySeeder رد شد.');

            return;
        }

        if (! is_file($previewAbsolute) || filesize($previewAbsolute) === 0) {
            FamilyBlurPreview::generateFromPath($absolute, $previewAbsolute);
        }

        $media = FamilyMedia::query()->updateOrCreate(
            ['storage_path' => self::STORY_MEDIA_PATH],
            [
                'type' => FamilyMediaType::Image,
                'disk' => 'public',
                'thumbnail_path' => is_file($previewAbsolute) ? self::STORY_PREVIEW_PATH : null,
                'original_filename' => 'demo-story-vertical.webp',
                'mime_type' => 'image/webp',
                'size' => (int) (filesize($absolute) ?: 0),
                'width' => 1080,
                'height' => 1920,
                'status' => FamilyMediaStatus::Ready,
                'uploaded_by' => $author->id,
            ],
        );

        $story = FamilyStory::query()->updateOrCreate(
            [
                'media_id' => $media->id,
                'published_by' => $author->id,
            ],
            [
                'caption' => self::STORY_CAPTION,
                'published_at' => now(),
                'expires_at' => now()->addDay(),
            ],
        );

        Cache::forever('family:stories:revision', ((int) Cache::get('family:stories:revision', 0)) + 1);
        app(FamilyMetaCacheService::class)->forgetAllMeta();

        $previewSize = is_file($previewAbsolute) ? filesize($previewAbsolute) : 0;

        $this->command?->info(sprintf(
            'استوری فعال: #%d | preview: %s (%d bytes) | انقضا: %s',
            $story->id,
            $media->thumbnail_path ?? '—',
            (int) $previewSize,
            $story->expires_at?->toDateTimeString() ?? '—',
        ));
    }

    private function ensureVerticalDemoImage(string $absolute): bool
    {
        // Regenerate if missing or too tiny (hard to see LQIP → sharp on localhost).
        if (is_file($absolute) && filesize($absolute) > 80_000) {
            return true;
        }

        if (! extension_loaded('gd') || ! function_exists('imagecreatetruecolor')) {
            return false;
        }

        $w = 1080;
        $h = 1920;
        $img = imagecreatetruecolor($w, $h);
        if ($img === false) {
            return false;
        }

        // Soft green gradient — matches family emerald branding.
        for ($y = 0; $y < $h; $y++) {
            $t = $y / max(1, $h - 1);
            $r = (int) round(12 + (34 - 12) * $t);
            $g = (int) round(48 + (120 - 48) * $t);
            $b = (int) round(42 + (88 - 42) * $t);
            $color = imagecolorallocate($img, $r, $g, $b);
            imageline($img, 0, $y, $w - 1, $y, $color);
        }

        // Layered orbs + noise so blur→sharp is obvious and file isn't tiny.
        for ($i = 0; $i < 18; $i++) {
            $orb = imagecolorallocatealpha(
                $img,
                120 + ($i * 7) % 100,
                180 + ($i * 11) % 60,
                140 + ($i * 5) % 80,
                40 + ($i % 40),
            );
            $cx = (int) (($i * 137) % $w);
            $cy = (int) (($i * 211) % $h);
            $size = 180 + ($i * 37) % 420;
            imagefilledellipse($img, $cx, $cy, $size, $size, $orb);
        }

        for ($n = 0; $n < 12_000; $n++) {
            $px = random_int(0, $w - 1);
            $py = random_int(0, $h - 1);
            $c = imagecolorallocatealpha($img, random_int(160, 255), random_int(180, 255), random_int(140, 220), random_int(70, 110));
            imagesetpixel($img, $px, $py, $c);
        }

        $ok = function_exists('imagewebp')
            ? imagewebp($img, $absolute, 88)
            : imagejpeg($img, $absolute, 90);

        imagedestroy($img);

        return (bool) $ok && is_file($absolute);
    }
}
