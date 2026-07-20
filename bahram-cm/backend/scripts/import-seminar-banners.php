<?php
// One-off: convert seminar promo banners to canonical site media paths.
$siteDir = __DIR__ . '/../storage/app/public/media/site';
@mkdir($siteDir, 0755, true);

function toWebp(string $src, string $dest): void
{
    $ext = strtolower(pathinfo($src, PATHINFO_EXTENSION));
    if ($ext === 'webp') {
        if (! copy($src, $dest)) {
            throw new RuntimeException("copy failed: {$src}");
        }

        return;
    }

    $image = match ($ext) {
        'jpg', 'jpeg' => @imagecreatefromjpeg($src),
        'png' => @imagecreatefrompng($src),
        default => false,
    };
    if ($image === false) {
        throw new RuntimeException("unsupported image: {$src}");
    }
    if (! imagewebp($image, $dest, 88)) {
        imagedestroy($image);
        throw new RuntimeException("webp write failed: {$dest}");
    }
    imagedestroy($image);
}

$map = [
    'C:/Users/Msi/Desktop/des/on.jpg' => $siteDir . '/seminar-promo-desktop-available.webp',
    'C:/Users/Msi/Desktop/des/off.jpg' => $siteDir . '/seminar-promo-desktop-full.webp',
    'C:/Users/Msi/Desktop/mo/on.webp' => $siteDir . '/seminar-promo-mobile-available.webp',
    'C:/Users/Msi/Desktop/mo/off.webp' => $siteDir . '/seminar-promo-mobile-full.webp',
];

foreach ($map as $src => $dest) {
    toWebp($src, $dest);
    echo basename($dest) . ' ← ' . basename($src) . PHP_EOL;
}

echo "Done.\n";
