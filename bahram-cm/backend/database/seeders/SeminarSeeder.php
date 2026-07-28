<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Seminar;
use App\Services\SeminarProductService;
use Illuminate\Database\Seeder;

class SeminarSeeder extends Seeder
{
    public function run(): void
    {
        $seminar = Seminar::query()->updateOrCreate(
            ['slug' => 'smynar-zaafranyh-thran'],
            [
                'title' => "سمینار زعفرانیه تهران",
                'date' => '2026-07-24 23:16:00',
                'location' => 'زعفرانیه',
                'description' => <<<'HTML'
<h2>درباره سمینار زعفرانیه تهران</h2>
<p>سمینار زعفرانیه یک تجربه حضوری برای رشد، یادگیری و ارتباط با افراد هم‌مسیر است. این رویداد فرصتی است تا از فضای آنلاین بیرون بیایی و در محیطی الهام‌بخش، روی مسیر حرفه‌ای‌ات تمرکز کنی.</p>

<h2>در این سمینار چه اتفاقی می‌افتد؟</h2>
<ul>
<li>ارائه تجربه‌ها و بینش‌های واقعی از مسیر رشد و فروش</li>
<li>استراتژی‌های کاربردی برای ادامه مسیر حرفه‌ای با دیدی روشن‌تر</li>
<li>فضای گفت‌وگو و یادگیری از تجربه‌های زنده</li>
<li>شبکه‌سازی هدفمند با افرادی که به‌دنبال ساختن آینده‌ای بزرگ‌تر هستند</li>
</ul>

<h2>این سمینار برای چه کسانی است؟</h2>
<ul>
<li>می‌خواهی مسیر رشد شخصی و حرفه‌ای‌ات را جدی‌تر پیش ببری</li>
<li>در فروش، کسب‌وکار یا محتوا فعال هستی و به نگاه تازه نیاز داری</li>
<li>می‌خواهی با افراد هم‌مسیر ارتباط بسازی</li>
<li>به‌دنبال تجربه‌ای حضوری و متمرکز هستی، نه فقط محتوای آنلاین</li>
</ul>

<h2>چرا حضوری؟</h2>
<p>بعضی چیزها در حضور ساخته می‌شود: تمرکز، انرژی جمع، گفت‌وگوی واقعی و شبکه‌ای که فقط با یک ویدیو شکل نمی‌گیرد. سمینار زعفرانیه برای همین طراحی شده است.</p>

<h2>نکته مهم درباره ظرفیت</h2>
<p>ظرفیت حضور محدود است و ثبت‌نام تنها تا تکمیل ظرفیت ادامه دارد. اگر تصمیم‌ات جدی است، بهتر است زودتر جا رزرو کنی.</p>
HTML,
                'cover_image' => '/storage/media/site/social-01.jpg',
                'status' => 'published',
                'ended_at' => '2026-07-24 23:59:00',
                'gallery' => [
                    [
                        'type' => 'image',
                        'aspect' => '16:9',
                        'src' => '/storage/media/site/seminar-zaferaniyeh-16x9-01.webp',
                        'alt' => 'سمینار زعفرانیه — نمای سالن',
                        'poster' => null,
                    ],
                    [
                        'type' => 'image',
                        'aspect' => '9:16',
                        'src' => '/storage/media/site/seminar-zaferaniyeh-9x16-01.webp',
                        'alt' => 'سمینار زعفرانیه — پرتره صحنه',
                        'poster' => null,
                    ],
                    [
                        'type' => 'image',
                        'aspect' => '16:9',
                        'src' => '/storage/media/site/seminar-zaferaniyeh-16x9-02.webp',
                        'alt' => 'سمینار زعفرانیه — لحظات جمع',
                        'poster' => null,
                    ],
                    [
                        'type' => 'video',
                        'aspect' => '16:9',
                        'src' => '/storage/media/site/seminar-zaferaniyeh-16x9-video.mp4',
                        'alt' => 'ویدیوی سمینار زعفرانیه',
                        'poster' => '/storage/media/site/seminar-zaferaniyeh-16x9-01.webp',
                    ],
                    [
                        'type' => 'image',
                        'aspect' => '9:16',
                        'src' => '/storage/media/site/seminar-zaferaniyeh-9x16-02.webp',
                        'alt' => 'سمینار زعفرانیه — فضای رویداد',
                        'poster' => null,
                    ],
                    [
                        'type' => 'image',
                        'aspect' => '9:16',
                        'src' => '/storage/media/site/seminar-zaferaniyeh-9x16-03.webp',
                        'alt' => 'سمینار زعفرانیه — لحظه پایانی',
                        'poster' => null,
                    ],
                    [
                        'type' => 'image',
                        'aspect' => '9:16',
                        'src' => '/storage/media/site/seminar-zaferaniyeh-9x16-04.jpg',
                        'alt' => 'سمینار زعفرانیه — پرتره حضار',
                        'poster' => null,
                    ],
                    [
                        'type' => 'image',
                        'aspect' => '16:9',
                        'src' => '/storage/media/site/seminar-zaferaniyeh-16x9-03.webp',
                        'alt' => 'سمینار زعفرانیه — پشت‌صحنه',
                        'poster' => null,
                    ],
                    [
                        'type' => 'video',
                        'aspect' => '9:16',
                        'src' => '/storage/media/site/seminar-zaferaniyeh-9x16-video.mp4',
                        'alt' => 'ویدیوی عمودی سمینار زعفرانیه',
                        'poster' => '/storage/media/site/seminar-zaferaniyeh-9x16-01.webp',
                    ],
                    [
                        'type' => 'image',
                        'aspect' => '16:9',
                        'src' => '/storage/media/site/seminar-zaferaniyeh-16x9-04.webp',
                        'alt' => 'سمینار زعفرانیه — نمای گسترده',
                        'poster' => null,
                    ],
                    [
                        'type' => 'image',
                        'aspect' => '16:9',
                        'src' => '/storage/media/site/seminar-zaferaniyeh-16x9-05.webp',
                        'alt' => 'سمینار زعفرانیه — فضای اصلی',
                        'poster' => null,
                    ],
                    [
                        'type' => 'image',
                        'aspect' => '9:16',
                        'src' => '/storage/media/site/seminar-zaferaniyeh-9x16-05.webp',
                        'alt' => 'سمینار زعفرانیه — جزئیات صحنه',
                        'poster' => null,
                    ],
                    [
                        'type' => 'image',
                        'aspect' => '16:9',
                        'src' => '/storage/media/site/seminar-zaferaniyeh-16x9-06.webp',
                        'alt' => 'سمینار زعفرانیه — جمع‌بندی روز',
                        'poster' => null,
                    ],
                ],
                'gallery_slider' => [
                    [
                        'src' => '/storage/media/site/seminar-zaferaniyeh-16x9-01.webp',
                        'alt' => 'سمینار زعفرانیه — نمای سالن',
                    ],
                    [
                        'src' => '/storage/media/site/seminar-zaferaniyeh-16x9-02.webp',
                        'alt' => 'سمینار زعفرانیه — صحنه اصلی',
                    ],
                    [
                        'src' => '/storage/media/site/seminar-zaferaniyeh-16x9-03.webp',
                        'alt' => 'سمینار زعفرانیه — پشت‌صحنه',
                    ],
                    [
                        'src' => '/storage/media/site/seminar-zaferaniyeh-16x9-04.webp',
                        'alt' => 'سمینار زعفرانیه — نمای گسترده',
                    ],
                    [
                        'src' => '/storage/media/site/seminar-zaferaniyeh-16x9-05.webp',
                        'alt' => 'سمینار زعفرانیه — فضای رویداد',
                    ],
                    [
                        'src' => '/storage/media/site/seminar-zaferaniyeh-16x9-06.webp',
                        'alt' => 'سمینار زعفرانیه — جمع‌بندی',
                    ],
                ],
                'price' => 8_900_000,
                'sale_price' => null,
                'capacity' => null,
                'banner_available' => '/storage/media/site/seminar-promo-desktop-available.webp',
                'banner_available_mobile' => '/storage/media/site/seminar-promo-mobile-available.webp',
                'banner_full' => '/storage/media/site/seminar-promo-desktop-full.webp',
                'banner_full_mobile' => '/storage/media/site/seminar-promo-mobile-full.webp',
                'promo_enabled' => true,
                'reference_discount_amount' => 29_800_000,
            ],
        );

        app(SeminarProductService::class)->syncProduct($seminar->fresh());

        $seminar = $seminar->fresh();
        if ($seminar?->product_id) {
            Product::query()->whereKey($seminar->product_id)->update([
                'short_description' => "سمینار حضوری زعفرانیه تهران با بهرام رستمی؛ رشد حرفه‌ای، یادگیری کاربردی، شبکه‌سازی با افراد هم‌مسیر و ظرفیت محدود.",
                'description' => <<<'HTML'
<h2>درباره سمینار زعفرانیه تهران</h2>
<p>سمینار زعفرانیه یک تجربه حضوری برای رشد، یادگیری و ارتباط با افراد هم‌مسیر است. این رویداد فرصتی است تا از فضای آنلاین بیرون بیایی و در محیطی الهام‌بخش، روی مسیر حرفه‌ای‌ات تمرکز کنی.</p>

<h2>در این سمینار چه اتفاقی می‌افتد؟</h2>
<ul>
<li>ارائه تجربه‌ها و بینش‌های واقعی از مسیر رشد و فروش</li>
<li>استراتژی‌های کاربردی برای ادامه مسیر حرفه‌ای با دیدی روشن‌تر</li>
<li>فضای گفت‌وگو و یادگیری از تجربه‌های زنده</li>
<li>شبکه‌سازی هدفمند با افرادی که به‌دنبال ساختن آینده‌ای بزرگ‌تر هستند</li>
</ul>

<h2>این سمینار برای چه کسانی است؟</h2>
<ul>
<li>می‌خواهی مسیر رشد شخصی و حرفه‌ای‌ات را جدی‌تر پیش ببری</li>
<li>در فروش، کسب‌وکار یا محتوا فعال هستی و به نگاه تازه نیاز داری</li>
<li>می‌خواهی با افراد هم‌مسیر ارتباط بسازی</li>
<li>به‌دنبال تجربه‌ای حضوری و متمرکز هستی، نه فقط محتوای آنلاین</li>
</ul>

<h2>چرا حضوری؟</h2>
<p>بعضی چیزها در حضور ساخته می‌شود: تمرکز، انرژی جمع، گفت‌وگوی واقعی و شبکه‌ای که فقط با یک ویدیو شکل نمی‌گیرد. سمینار زعفرانیه برای همین طراحی شده است.</p>

<h2>نکته مهم درباره ظرفیت</h2>
<p>ظرفیت حضور محدود است و ثبت‌نام تنها تا تکمیل ظرفیت ادامه دارد. اگر تصمیم‌ات جدی است، بهتر است زودتر جا رزرو کنی.</p>
HTML,
                'meta_title' => "سمینار زعفرانیه تهران | بهرام رستمی",
                'meta_description' => "سمینار حضوری زعفرانیه تهران با بهرام رستمی؛ تجربه‌ها و استراتژی‌های کاربردی برای رشد حرفه‌ای، شبکه‌سازی و مسیر فروش. ظرفیت محدود.",
                'course_level' => 'رویداد حضوری',
                'course_duration' => 'یک جلسه',
            ]);
        }
    }
}
