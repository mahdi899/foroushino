<?php

declare(strict_types=1);

function cropResizeWebp(string $src, string $dest, int $tw, int $th): void
{
    if (! is_file($src)) {
        throw new RuntimeException("Missing source: {$src}");
    }

    $img = imagecreatefromwebp($src);
    $sw = imagesx($img);
    $sh = imagesy($img);
    $scale = max($tw / $sw, $th / $sh);
    $nw = (int) round($sw * $scale);
    $nh = (int) round($sh * $scale);
    $tmp = imagecreatetruecolor($nw, $nh);
    imagealphablending($tmp, true);
    imagesavealpha($tmp, true);
    imagecopyresampled($tmp, $img, 0, 0, 0, 0, $nw, $nh, $sw, $sh);
    $out = imagecreatetruecolor($tw, $th);
    imagealphablending($out, true);
    imagesavealpha($out, true);
    $ox = (int) max(0, ($nw - $tw) / 2);
    $oy = (int) max(0, ($nh - $th) / 2);
    imagecopy($out, $tmp, 0, 0, $ox, $oy, $tw, $th);
    $dir = dirname($dest);
    if (! is_dir($dir)) {
        mkdir($dir, 0777, true);
    }
    imagewebp($out, $dest, 86);
    imagedestroy($img);
    imagedestroy($tmp);
    imagedestroy($out);
}

$base = __DIR__.'/../storage/app/public/media';

cropResizeWebp(
    "{$base}/2026/07/01kx44z2tqbxdz8jfnc08n7mx8.webp",
    "{$base}/site/seminar-promo-mobile-available.webp",
    1080,
    280,
);

cropResizeWebp(
    "{$base}/2026/07/01kx468m91vqw94kq786w50376.webp",
    "{$base}/site/seminar-promo-mobile-full.webp",
    1080,
    280,
);

echo "OK\n";
