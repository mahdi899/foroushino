<?php

namespace Database\Seeders;

use App\Models\MiniCourse;
use Illuminate\Database\Seeder;

class MiniCourseSeeder extends Seeder
{
    public function run(): void
    {
        $courses = [
            [
                'slug' => 'alfabe-kampain-nevisi',
                'title' => 'مینی‌دوره الفبای کمپین‌نویسی',
                'subtitle' => 'ورود سریع به تفکر کمپین‌محور',
                'summary' => 'الفبای کمپین‌نویسی؛ از ایده تا پیام، ساختار و اجرای اولیه.',
                'description' => '<p>در این مینی‌دوره با مفاهیم پایه کمپین‌نویسی آشنا می‌شوید: تعریف کمپین، تفاوت آن با تولید محتوای پراکنده، ساخت پیام مرکزی و طراحی مسیر کوتاه برای جذب مخاطب.</p><p>این دوره نقطه شروعی است قبل از ورود به مسیر اصلی کمپین‌نویسی آکادمی بهرام.</p>',
                'aparat_hash' => 'oyt346k',
                'level' => 'مقدماتی',
                'duration' => 'رایگان',
                'sort_order' => 1,
            ],
            [
                'slug' => 'senario-nevisi',
                'title' => 'مینی‌دوره سناریونویسی',
                'subtitle' => 'ساختار روایت برای ویدیو و کمپین',
                'summary' => 'سناریونویسی کاربردی برای ویدیوهای آموزشی و تبلیغاتی.',
                'description' => '<p>در این مینی‌دوره یاد می‌گیرید چطور یک سناریوی کوتاه و مؤثر بنویسید: قلاب آغازین، رویداد اصلی، تبدیل مخاطب و بستن داستان.</p><p>مناسب برای کسانی که می‌خواهند قبل از تولید ویدیو، ساختار روایت را درست بچینند.</p>',
                'aparat_hash' => 'falji09',
                'level' => 'مقدماتی',
                'duration' => 'رایگان',
                'sort_order' => 2,
            ],
        ];

        foreach ($courses as $course) {
            MiniCourse::query()->updateOrCreate(
                ['slug' => $course['slug']],
                array_merge($course, [
                    'is_active' => true,
                    'comments_enabled' => true,
                ]),
            );
        }
    }
}
