<?php

namespace App\Support;

/** Reads image width/height with EXIF orientation applied (portrait photos from phones). */
final class FamilyImageDimensions
{
    /**
     * @return array{width: ?int, height: ?int}
     */
    public static function fromPath(string $path): array
    {
        $dims = @getimagesize($path);
        if (! is_array($dims)) {
            return ['width' => null, 'height' => null];
        }

        $width = (int) $dims[0];
        $height = (int) $dims[1];

        if (function_exists('exif_read_data')) {
            $exif = @exif_read_data($path);
            $orientation = (int) ($exif['Orientation'] ?? 1);
            if (in_array($orientation, [5, 6, 7, 8], true)) {
                [$width, $height] = [$height, $width];
            }
        }

        return ['width' => $width, 'height' => $height];
    }
}
