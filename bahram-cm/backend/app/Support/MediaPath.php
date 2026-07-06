<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

/** WordPress-style dated object keys: media/YYYY/MM/{ulid}.ext */
final class MediaPath
{
    public static function publicObjectKey(UploadedFile $file, ?\DateTimeInterface $at = null): string
    {
        $at ??= now();

        return sprintf('media/%s/%s', $at->format('Y/m'), self::uniqueFilename($file));
    }

    public static function publicObjectKeyFromPath(string $sourcePath, ?\DateTimeInterface $at = null): string
    {
        $at ??= now();
        $ext = Str::lower(pathinfo($sourcePath, PATHINFO_EXTENSION) ?: 'bin');

        return sprintf('media/%s/%s.%s', $at->format('Y/m'), Str::lower(Str::ulid()->toString()), $ext);
    }

    public static function privateObjectKey(UploadedFile $file, ?\DateTimeInterface $at = null): string
    {
        $at ??= now();

        return sprintf('private/%s/%s', $at->format('Y/m'), self::uniqueFilename($file));
    }

    private static function uniqueFilename(UploadedFile $file): string
    {
        $ext = self::extension($file);

        return Str::lower(Str::ulid()->toString()).'.'.$ext;
    }

    private static function extension(UploadedFile $file): string
    {
        $ext = $file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'bin';

        return Str::lower((string) $ext);
    }
}
