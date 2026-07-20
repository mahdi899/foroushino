<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;

class MediaHostsSeeder extends Seeder
{
    public function run(): void
    {
        Artisan::call('media:sync-hosts', ['--import' => true]);
    }
}
