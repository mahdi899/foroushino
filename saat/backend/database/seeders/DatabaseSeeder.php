<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            ProductSeeder::class,
            CampaignSeeder::class,
            ScriptObjectionSeeder::class,
            AchievementSeeder::class,
            TeamSeeder::class,
            UserSeeder::class,
            LeadSeeder::class,
            SalesActivitySeeder::class,
        ]);
    }
}
