<?php

namespace App\Support;

use Illuminate\Support\Str;

/** Canonical object keys for family media inside the shared media library. */
final class FamilyMediaPath
{
    public static function objectKey(string $type, string $extension, ?\DateTimeInterface $at = null): string
    {
        $at ??= now();
        $ext = Str::lower(ltrim($extension, '.')) ?: 'bin';
        $ulid = Str::lower(Str::ulid()->toString());

        return sprintf('media/family/%s/%s/%s.%s', $at->format('Y/m'), $type, $ulid, $ext);
    }

    public static function isLibraryPath(?string $path): bool
    {
        return filled($path) && str_starts_with($path, 'media/family/');
    }
}
