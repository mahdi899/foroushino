<?php

namespace Database\Seeders;

use App\Models\Achievement;
use Illuminate\Database\Seeder;

class AchievementSeeder extends Seeder
{
    public function run(): void
    {
        $achievements = [
            ['code' => 'first_call', 'title' => 'اولین قدم', 'description' => 'اولین تماس خود را ثبت کن.', 'icon' => '📞', 'target' => 1],
            ['code' => 'first_sale', 'title' => 'اولین فروش', 'description' => 'اولین فروش تاییدشده خود را ثبت کن.', 'icon' => '🎉', 'target' => 1],
            ['code' => 'ten_sales', 'title' => 'فروشنده حرفه‌ای', 'description' => '۱۰ فروش تاییدشده ثبت کن.', 'icon' => '🏆', 'target' => 10],
            ['code' => 'fifty_sales', 'title' => 'ستاره فروش', 'description' => '۵۰ فروش تاییدشده ثبت کن.', 'icon' => '⭐', 'target' => 50],
            ['code' => 'hundred_calls', 'title' => 'پرتلاش', 'description' => '۱۰۰ تماس ثبت کن.', 'icon' => '💪', 'target' => 100],
            ['code' => 'streak_7', 'title' => 'هفت روز پیاپی', 'description' => '۷ روز متوالی فعال باش.', 'icon' => '🔥', 'target' => 7],
            ['code' => 'streak_30', 'title' => 'ماراتن‌کار', 'description' => '۳۰ روز متوالی فعال باش.', 'icon' => '🚀', 'target' => 30],
            ['code' => 'quality_master', 'title' => 'استاد کیفیت', 'description' => 'نرخ تبدیل بالای ۱۵٪ در یک روز.', 'icon' => '🎯', 'target' => 1],
        ];

        foreach ($achievements as $achievement) {
            Achievement::query()->updateOrCreate(['code' => $achievement['code']], $achievement);
        }
    }
}
