<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Storage;

require '/var/www/bahram-cm/backend/vendor/autoload.php';

$app = require '/var/www/bahram-cm/backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$disk = (string) config('bahram.uploads.public_disk', 'public');
$files = [
    'media/site/family-chat-wallpaper-dark.webp',
    'media/site/family-chat-wallpaper-light.webp',
    'media/site/family-chat-wallpaper.webp',
];

foreach ($files as $rel) {
    $local = storage_path('app/public/'.$rel);
    if (! is_file($local)) {
        fwrite(STDERR, "missing {$local}\n");
        exit(1);
    }
    Storage::disk($disk)->put($rel, file_get_contents($local));
    echo "Uploaded {$rel} via disk={$disk} size=".filesize($local).PHP_EOL;
}
