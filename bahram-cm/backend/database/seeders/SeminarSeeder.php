<?php

namespace Database\Seeders;

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
                'title' => 'سمینار زعفرانیه تهران',
                'date' => '2026-07-24 23:16:00',
                'location' => 'زعفرانیه',
                'description' => <<<'HTML'
سمینار زعفرانیه؛ یک تجربه متفاوت برای رشد، یادگیری و ارتباط با افراد هم‌مسیر

در این سمینار، مجموعه‌ای از تجربیات، بینش‌ها و استراتژی‌های کاربردی ارائه می‌شود تا شرکت‌کنندگان بتوانند مسیر رشد شخصی و حرفه‌ای خود را با دیدی تازه‌تر ادامه دهند.

این رویداد فرصتی است برای حضور در یک فضای الهام‌بخش، یادگیری از تجربه‌های واقعی و ایجاد ارتباط با افرادی که به دنبال ساختن آینده‌ای بزرگ‌تر هستند.

ظرفیت حضور در سمینار محدود است و ثبت‌نام تنها تا تکمیل ظرفیت ادامه خواهد داشت.
HTML,
                'cover_image' => '/storage/media/site/social-01.jpg',
                'status' => 'published',
                'price' => 8_900_000,
                'sale_price' => null,
                'capacity' => null,
                'banner_available' => '/storage/media/2026/07/01kx44z2tqbxdz8jfnc08n7mx8.webp',
                'banner_available_mobile' => '/storage/media/2026/07/01kxahqjnef8wmv5c7btf6hjej.webp',
                'banner_full' => '/storage/media/2026/07/01kx468m91vqw94kq786w50376.webp',
                'banner_full_mobile' => '/storage/media/site/seminar-promo-mobile-full.webp',
                'promo_enabled' => true,
            ],
        );

        app(SeminarProductService::class)->syncProduct($seminar->fresh());
    }
}
