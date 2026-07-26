<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$disk = config('bahram.uploads.public_disk');
$dir = storage_path('app/public/media/site');
foreach (glob($dir . '/platform-*.png') as $abs) {
    $rel = 'media/site/' . basename($abs);
    Illuminate\Support\Facades\Storage::disk($disk)->put($rel, file_get_contents($abs));
    echo "cdn: {$rel} (" . filesize($abs) . " bytes)\n";
}
