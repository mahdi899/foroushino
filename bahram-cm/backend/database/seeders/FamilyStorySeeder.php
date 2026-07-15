<?php

namespace Database\Seeders;

use App\Models\FamilyMedia;
use App\Models\FamilyStory;
use App\Models\User;
use Database\Seeders\Support\FamilyDemoAssets;
use Illuminate\Database\Seeder;

/**
 * استوری ۲۴ ساعته دمو — برای تست حلقه پروفایل و StoryViewer.
 * Idempotent: upsert روی رسانهٔ demo-video-vertical (۹:۱۶).
 */
class FamilyStorySeeder extends Seeder
{
    public const STORY_MEDIA_PATH = 'family-demo/demo-video-vertical.mp4';

    public const STORY_CAPTION = '📸 استوری تست — یه لحظه از مسیر با خانواده به اشتراک می‌ذارم.';

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

        $media = FamilyMedia::query()->where('storage_path', self::STORY_MEDIA_PATH)->first();
        if (! $media) {
            $assets = (new FamilyDemoAssets)->deploy($author);
            $media = $assets['videoVertical'];
        }

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

        $this->command?->info(sprintf(
            'استوری فعال: #%d (انقضا: %s)',
            $story->id,
            $story->expires_at?->toDateTimeString() ?? '—',
        ));
    }
}
