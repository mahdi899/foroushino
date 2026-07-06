<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $products = [
            ['name' => 'دوره شغل کمپین‌نویسی', 'slug' => 'campaign-writing-job', 'category' => 'دوره شغلی', 'price' => 12_500_000, 'commission_rate' => 12, 'description' => 'دوره تخصصی آموزش کمپین‌نویسی و کسب درآمد از تبلیغات.'],
            ['name' => 'دوره شغل کپی‌رایتینگ', 'slug' => 'copywriting-job', 'category' => 'دوره شغلی', 'price' => 9_800_000, 'commission_rate' => 12, 'description' => 'آموزش نویسندگی تبلیغاتی حرفه‌ای برای کسب‌وکارها.'],
            ['name' => 'دوره شغل مدیریت شبکه‌های اجتماعی', 'slug' => 'social-media-manager-job', 'category' => 'دوره شغلی', 'price' => 8_500_000, 'commission_rate' => 10, 'description' => 'مسیر شغلی مدیریت پیج و شبکه‌های اجتماعی برندها.'],
            ['name' => 'دوره جامع فروش و مذاکره', 'slug' => 'sales-negotiation-mastery', 'category' => 'مهارت فروش', 'price' => 6_400_000, 'commission_rate' => 15, 'description' => 'تکنیک‌های حرفه‌ای فروش تلفنی و مذاکره.'],
        ];

        foreach ($products as $product) {
            Product::query()->firstOrCreate(['slug' => $product['slug']], $product);
        }
    }
}
