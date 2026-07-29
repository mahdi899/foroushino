<?php

namespace Database\Seeders;

use App\Models\ReferenceChannel;
use App\Services\ReferenceChannelProductService;
use Illuminate\Database\Seeder;

/**
 * Canonical reference-channel product used by marketing (/reference-channels/kanal-mrgf)
 * and student/Telegram purchase flows.
 */
class ReferenceChannelSeeder extends Seeder
{
    public const SLUG = 'kanal-mrgf';

    public const COVER_IMAGE = '/storage/media/site/reference-channel-hero.webp';

    public const COVER_IMAGE_MOBILE = '/storage/media/site/reference-channel-hero-mobile.webp';

    public function run(): void
    {
        $channel = ReferenceChannel::query()->updateOrCreate(
            ['slug' => self::SLUG],
            [
                'title' => 'کانال مرجع',
                'description' => <<<'HTML'
<p>محصول آماده است؛ تو فقط فروش را یاد بگیر. محصول، محتوا و مسیر اجرا را از ما بگیر؛ در کانال خودت بفروش و از فروش‌های خودت درآمد داشته باش.</p>

<h2>داخل کانال مرجع چه می‌گیری؟</h2>
<ul>
<li>محصول آماده برای فروش</li>
<li>آموزش فروش و ساخت کانال فروش</li>
<li>کوچینگ و همراهی در مسیر</li>
<li>درآمد مستقیم از فروش‌های تأییدشده</li>
</ul>

<h2>چرا کانال مرجع؟</h2>
<p>برای شروع فروش لازم نیست همه‌چیز را از صفر بسازی. ما محصول و آموزش را می‌دهیم؛ تو کانالت را می‌سازی، محتوا و کمپین اجرا می‌کنی و از فروش‌های خودت سهم می‌گیری.</p>
HTML,
                'cover_image' => self::COVER_IMAGE,
                'cover_image_mobile' => self::COVER_IMAGE_MOBILE,
                'status' => 'published',
                'show_in_panel' => true,
                'show_in_telegram' => true,
                'price' => 30_000_000,
            ],
        );

        app(ReferenceChannelProductService::class)->syncProduct($channel->fresh());

        // Keep storefront copy aligned with the public landing page.
        $product = $channel->fresh()->product;
        if ($product) {
            $product->update([
                'short_description' => 'محصول آماده است؛ تو فقط فروش را یاد بگیر. محصول، محتوا و آموزش از ما؛ فروش در کانال خودت و درآمد مستقیم.',
                'meta_title' => 'کانال مرجع | آکادمی بهرام',
                'meta_description' => 'محصول آماده است؛ تو فقط فروش را یاد بگیر. کانال مرجع آکادمی بهرام — محصول، آموزش فروش، کوچینگ و درآمد مستقیم از فروش.',
                'featured_image' => self::COVER_IMAGE,
                'show_on_courses' => false,
                'is_active' => true,
            ]);
        }
    }
}
