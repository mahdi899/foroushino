<?php

namespace App\Support;

final class FamilyMediaUrl
{
    public static function fromPath(?string $storagePath): ?string
    {
        if (! filled($storagePath)) {
            return null;
        }

        $cdn = rtrim((string) config('family.media.cdn_url'), '/');
        if ($cdn === '') {
            return null;
        }

        return $cdn.'/'.ltrim($storagePath, '/');
    }
}
