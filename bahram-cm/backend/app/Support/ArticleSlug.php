<?php

namespace App\Support;

use Illuminate\Support\Str;

final class ArticleSlug
{
    /** Build a URL-safe ASCII slug from a title or raw slug input. */
    public static function normalize(?string $value, ?string $fallbackTitle = null): string
    {
        $candidates = array_filter([
            self::decode($value),
            self::decode($fallbackTitle),
            'article',
        ]);

        foreach ($candidates as $candidate) {
            $slug = Str::slug($candidate);
            if (filled($slug)) {
                return $slug;
            }
        }

        return 'article';
    }

    /** @return list<string> */
    public static function lookupCandidates(string $slug): array
    {
        $decoded = self::decode($slug);

        return array_values(array_unique(array_filter([
            $slug,
            $decoded,
            Str::slug($decoded),
        ])));
    }

    private static function decode(?string $value): ?string
    {
        if (! filled($value)) {
            return null;
        }

        $decoded = urldecode($value);

        return filled($decoded) ? $decoded : $value;
    }
}
