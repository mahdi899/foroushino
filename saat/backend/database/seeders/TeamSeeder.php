<?php

namespace Database\Seeders;

use App\Models\Team;
use Illuminate\Database\Seeder;

class TeamSeeder extends Seeder
{
    private const TEAM_NAMES = [
        'تیم الماس', 'تیم طلایی', 'تیم نقره‌ای', 'تیم پیشرو', 'تیم ققنوس',
        'تیم عقاب‌ها', 'تیم ستاره', 'تیم موفقیت', 'تیم رشد', 'تیم قهرمانان',
    ];

    public function run(): void
    {
        foreach (self::TEAM_NAMES as $name) {
            Team::query()->firstOrCreate(['name' => $name]);
        }
    }
}
