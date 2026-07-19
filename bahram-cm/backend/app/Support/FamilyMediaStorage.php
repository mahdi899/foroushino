<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

final class FamilyMediaStorage
{
    /** Remove a stale local public copy after the canonical file lives on FTP/CDN. */
    public static function purgeLocalPublicCopy(?string $storagePath): void
    {
        if (! FamilyMediaPath::isLibraryPath($storagePath)) {
            return;
        }

        try {
            Storage::disk('public')->delete($storagePath);
        } catch (\Throwable) {
            // Best effort — remote copy is canonical.
        }
    }
}
