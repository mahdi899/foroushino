<?php

namespace Database\Seeders;

use App\Models\FamilyPost;
use Database\Seeders\Support\FamilyDemoPostLookup;
use Illuminate\Database\Seeder;

/**
 * یک پست سنجاق‌شده برای تست نوار Telegram-style زیر هدر.
 * Idempotent: فقط demo_key تعیین‌شده سنجاق می‌شود.
 */
class FamilyPinnedPostSeeder extends Seeder
{
    /** پست تصویری — تامبنیل در نوار سنجاق */
    public const PINNED_DEMO_KEY = 'image-moment';

    public function run(): void
    {
        FamilyPost::query()->update([
            'is_pinned' => false,
            'pinned_at' => null,
        ]);

        $post = FamilyDemoPostLookup::find(self::PINNED_DEMO_KEY);
        if (! $post) {
            $this->command?->warn(
                'پست دمو «'.self::PINNED_DEMO_KEY.'» یافت نشد — ابتدا FamilySeeder را اجرا کنید.',
            );

            return;
        }

        $post->update([
            'is_pinned' => true,
            'pinned_at' => now(),
        ]);

        $this->command?->info(sprintf('پست سنجاق‌شده: #%d (%s)', $post->id, self::PINNED_DEMO_KEY));
    }
}
