<?php

/**
 * Publish seminar site media (promo banners + covers + gallery) from
 * storage/app/public/media/site/ to the download host (CDN), and point
 * seminars at the canonical portable /storage paths.
 *
 * Usage (on server after deploy): php scripts/publish-seminar-banners.php
 */
declare(strict_types=1);

use App\Support\RuntimeCache;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$canonicalBanners = [
    'banner_available' => '/storage/media/site/seminar-promo-desktop-available.webp',
    'banner_available_mobile' => '/storage/media/site/seminar-promo-mobile-available.webp',
    'banner_full' => '/storage/media/site/seminar-promo-desktop-full.webp',
    'banner_full_mobile' => '/storage/media/site/seminar-promo-mobile-full.webp',
];

$canonicalCovers = [
    'cover_image' => '/storage/media/site/seminar-zaferaniyeh-cover.webp',
    'cover_image_mobile' => '/storage/media/site/seminar-zaferaniyeh-cover-mobile.webp',
];

$siteDir = storage_path('app/public/media/site');
$filenames = array_values(array_filter(
    scandir($siteDir) ?: [],
    static fn (string $name): bool => str_starts_with($name, 'seminar-')
        && is_file($siteDir.DIRECTORY_SEPARATOR.$name),
));

if ($filenames === []) {
    fwrite(STDERR, "No seminar-* files found in {$siteDir}\n");
    exit(1);
}

$disk = (string) config('bahram.uploads.public_disk', 'public');
echo "Upload disk: {$disk}\n";
echo 'Publishing '.count($filenames)." seminar site asset(s)\n";

foreach ($filenames as $name) {
    $rel = 'media/site/'.$name;
    $local = $siteDir.DIRECTORY_SEPARATOR.$name;
    Storage::disk($disk)->put($rel, file_get_contents($local));
    echo "Uploaded {$rel}\n";
}

$promoUpdated = DB::table('seminars')
    ->where('promo_enabled', true)
    ->update($canonicalBanners);

$coverUpdated = DB::table('seminars')
    ->where('slug', 'smynar-zaafranyh-thran')
    ->update($canonicalCovers);

echo "Updated {$promoUpdated} promo seminar banner path(s)\n";
echo "Updated {$coverUpdated} seminar cover path(s)\n";

RuntimeCache::forget('public_seminars:promo');
foreach (DB::table('seminars')->where('status', 'published')->pluck('slug') as $slug) {
    RuntimeCache::forget('public_seminars:show:'.$slug);
}

Artisan::call('media:sync', ['--import' => true]);
echo Artisan::output();

echo "Done.\n";
