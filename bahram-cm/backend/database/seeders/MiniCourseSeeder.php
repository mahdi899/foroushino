<?php

namespace Database\Seeders;

use App\Models\MiniCourse;
use App\Models\Product;
use App\Services\MiniCourseProductService;
use Illuminate\Database\Seeder;

class MiniCourseSeeder extends Seeder
{
    public function run(): void
    {
        $courses = [
            [
                'slug' => 'alfabe-kampain-nevisi',
                'title' => "مینی‌دوره الفبای کمپین‌نویسی",
                'subtitle' => "ورود سریع به تفکر کمپین‌محور",
                'summary' => "الفبای کمپین‌نویسی؛ از ایده تا پیام مرکزی، ساختار اولیه و آمادگی ورود به مسیر حرفه‌ای.",
                'description' => <<<'HTML'
<h2>الفبای کمپین‌نویسی چیست؟</h2>
<p>این مینی‌دوره رایگان نقطه شروع مسیر کمپین‌نویسی است. اگر هنوز فرق «محتوای پراکنده» و «کمپین» برایت روشن نیست، اینجا از پایه شروع می‌کنی.</p>

<h2>در این مینی‌دوره چه می‌بینی؟</h2>
<ul>
<li>تعریف ساده و کاربردی کمپین</li>
<li>تفاوت کمپین با تولید محتوای پراکنده</li>
<li>ساخت پیام مرکزی</li>
<li>طراحی مسیر کوتاه برای جذب مخاطب</li>
<li>آمادگی ذهنی برای ورود به مسیر اصلی کمپین‌نویسی</li>
</ul>

<h2>برای چه کسانی مناسب است؟</h2>
<ul>
<li>تازه‌کاری که می‌خواهد با زبان کمپین آشنا شود</li>
<li>کسی که محتوا می‌سازد ولی فروش یا نتیجه نمی‌گیرد</li>
<li>کسی که قبل از دوره اصلی می‌خواهد پایه‌ها را درست بفهمد</li>
</ul>

<h2>خروجی کوتاه این مینی‌دوره</h2>
<p>بعد از این مینی‌دوره، تصویر روشن‌تری از کمپین داری و می‌فهمی مسیر اصلی کمپین‌نویسی آکادمی بهرام رستمی از کجا شروع می‌شود و به کجا می‌رود.</p>
HTML,
                'meta_title' => "مینی‌دوره الفبای کمپین‌نویسی | بهرام رستمی",
                'meta_description' => "مینی‌دوره رایگان الفبای کمپین‌نویسی با بهرام رستمی؛ از ایده تا پیام مرکزی و ساختار اولیه — نقطه شروع مسیر کمپین‌نویسی.",
                'aparat_hash' => 'oyt346k',
                'thumbnail' => '/storage/media/2026/07/01kx63nw6b1pwh4y84q5jvjhtg.webp',
                'level' => 'مقدماتی',
                'duration' => 'رایگان',
                'sort_order' => 1,
            ],
            [
                'slug' => 'senario-nevisi',
                'title' => "مینی‌دوره سناریونویسی",
                'subtitle' => "ساختار روایت برای ویدیو و کمپین",
                'summary' => "سناریونویسی کاربردی برای ویدیوهای آموزشی و تبلیغاتی؛ از قلاب آغازین تا تبدیل مخاطب.",
                'description' => <<<'HTML'
<h2>سناریونویسی چرا مهم است؟</h2>
<p>قبل از تولید ویدیو، باید ساختار روایت را بدانی. بدون سناریو، ویدیو ممکن است قشنگ باشد ولی مخاطب را نگه ندارد و به اقدام نرساند.</p>

<h2>در این مینی‌دوره چه یاد می‌گیری؟</h2>
<ul>
<li>نوشتن قلاب آغازین برای جلب توجه در چند ثانیه اول</li>
<li>چیدن رویداد اصلی روایت</li>
<li>مسیر تبدیل مخاطب داخل سناریو</li>
<li>بستن داستان طوری که پیام کمپین تمام شود</li>
<li>سناریوی کوتاه و کاربردی برای ویدیوهای آموزشی و تبلیغاتی</li>
</ul>

<h2>این مینی‌دوره برای چه کسانی است؟</h2>
<ul>
<li>می‌خواهی برای اینستا، یوتیوب یا تبلیغ، ویدیو بسازی</li>
<li>قبل از فیلم‌برداری به ساختار روایت نیاز داری</li>
<li>در مسیر کمپین‌نویسی هستی و می‌خواهی پیام را در قالب ویدیو پیاده کنی</li>
</ul>

<h2>خروجی</h2>
<p>بعد از این مینی‌دوره می‌توانی یک سناریوی کوتاه و مؤثر بنویسی که از قلاب شروع شود و به اقدام مخاطب برسد — نه فقط به یک ویدیوی معمولی.</p>
HTML,
                'meta_title' => "مینی‌دوره سناریونویسی | بهرام رستمی",
                'meta_description' => "مینی‌دوره رایگان سناریونویسی با بهرام رستمی؛ ساختار روایت برای ویدیوهای آموزشی و تبلیغاتی کمپین، از قلاب تا تبدیل مخاطب.",
                'aparat_hash' => 'falji09',
                'thumbnail' => '/storage/media/2026/07/01kx63t8e2xtbb5eq6kmv9zs2k.webp',
                'level' => 'مقدماتی',
                'duration' => 'رایگان',
                'sort_order' => 2,
            ],
        ];

        foreach ($courses as $course) {
            $item = MiniCourse::query()->updateOrCreate(
                ['slug' => $course['slug']],
                array_merge($course, [
                    'is_active' => true,
                    'comments_enabled' => true,
                ]),
            );

            app(MiniCourseProductService::class)->syncProduct($item);

            if ($item->product_id) {
                $productRow = collect($courses)->firstWhere('slug', $course['slug']);
                Product::query()->whereKey($item->product_id)->update([
                    'description' => $course['description'],
                    'meta_title' => $course['meta_title'],
                    'meta_description' => $course['meta_description'],
                    'course_level' => $course['level'],
                    'course_duration' => $course['duration'],
                    'short_description' => $course['summary'],
                ]);
            }
        }
    }
}
