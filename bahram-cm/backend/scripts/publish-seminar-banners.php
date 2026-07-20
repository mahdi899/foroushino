<?php

/**
 * Publish seminar promo banners from storage/app/public/media/site/ to the download host
 * and point active seminars at the canonical paths.
 *
 * Usage (on server): php scripts/publish-seminar-banners.php
 */
declare(strict_types=1);

use App\Support\RuntimeCache;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$canonical = [
    'banner_available' => '/storage/media/site/seminar-promo-desktop-available.webp',
    'banner_available_mobile' => '/storage/media/site/seminar-promo-mobile-available.webp',
    'banner_full' => '/storage/media/site/seminar-promo-desktop-full.webp',
    'banner_full_mobile' => '/storage/media/site/seminar-promo-mobile-full.webp',
];

$filenames = [
    'seminar-promo-desktop-available.webp',
    'seminar-promo-desktop-full.webp',
    'seminar-promo-mobile-available.webp',
    'seminar-promo-mobile-full.webp',
];

$disk = (string) config('bahram.uploads.public_disk', 'public');
echo "Upload disk: {$disk}\n";

foreach ($filenames as $name) {
    $rel = 'media/site/'.$name;
    $local = storage_path('app/public/'.$rel);
    if (! is_file($local)) {
        fwrite(STDERR, "Missing local file: {$local}\n");
        exit(1);
    }

    Storage::disk($disk)->put($rel, file_get_contents($local));
    echo "Uploaded {$rel}\n";
}

$updated = DB::table('seminars')
    ->where('promo_enabled', true)
    ->update($canonical);

echo "Updated {$updated} promo seminar(s)\n";

RuntimeCache::forget('public_seminars:promo');
Artisan::call('media:sync', ['--import' => true]);
echo Artisan::output();

echo "Done.\n";
