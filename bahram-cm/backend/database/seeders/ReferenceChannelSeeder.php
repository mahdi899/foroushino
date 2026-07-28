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

    public function run(): void
    {
        $channel = ReferenceChannel::query()->updateOrCreate(
            ['slug' => self::SLUG],
            [
                'title' => 'کانال مرجع',
                'description' => <<<'HTML'
<p>کانال مرجع کانالی است که افراد در آن ثبت‌نام می‌کنند و می‌توانند گروه‌های زیرمجموعه ۱۰۰ نفری خودشان را داشته باشند. با فروش دوره‌ها و محصولات آکادمی درآمد مستقیم می‌سازند و از هر فروشی که دارند درصد برمی‌دارند.</p>

<h2>چه چیزی می‌گیری؟</h2>
<ul>
<li>عضویت در کانال مرجع آکادمی بهرام</li>
<li>امکان ساخت گروه زیرمجموعه تا ۱۰۰ نفر</li>
<li>فروش دوره‌ها و محصولات آکادمی</li>
<li>برداشت درصد مستقیم از هر فروش</li>
</ul>

<h2>مسیر درآمد</h2>
<p>بعد از ثبت‌نام، گروه خودت را می‌سازی، محصولات آکادمی را معرفی و می‌فروشی — و از هر فروش، سهم مستقیم خودت را برمی‌داری.</p>
HTML,
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
                'short_description' => 'ثبت‌نام، گروه ۱۰۰ نفری و درآمد مستقیم از فروش دوره‌ها و محصولات آکادمی.',
                'meta_title' => 'کانال مرجع | آکادمی بهرام',
                'meta_description' => 'کانال مرجع آکادمی بهرام؛ ثبت‌نام، گروه زیرمجموعه ۱۰۰ نفری و درآمد مستقیم از فروش دوره‌ها و محصولات.',
                'show_on_courses' => false,
                'is_active' => true,
            ]);
        }
    }
}
