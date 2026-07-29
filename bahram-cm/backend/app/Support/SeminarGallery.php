<?php

namespace App\Support;

final class SeminarGallery
{
    public const ASPECTS = ['16:9', '9:16'];

    public const TYPES = ['image', 'video'];

    public const SLIDER_MAX = 6;

    /**
     * Normalize admin payload into portable media references.
     *
     * @param  mixed  $items
     * @return list<array{type: string, aspect: string, src: string, alt: ?string, poster: ?string}>
     */
    public static function normalize(mixed $items): array
    {
        if (! is_array($items)) {
            return [];
        }

        $out = [];

        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }

            $type = (string) ($item['type'] ?? 'image');
            $aspect = (string) ($item['aspect'] ?? '16:9');
            $srcRaw = isset($item['src']) ? trim((string) $item['src']) : '';
            if ($srcRaw === '' || ! in_array($type, self::TYPES, true) || ! in_array($aspect, self::ASPECTS, true)) {
                continue;
            }

            $src = MediaUrl::reference($srcRaw) ?? $srcRaw;
            $posterRaw = isset($item['poster']) ? trim((string) $item['poster']) : '';
            $poster = $posterRaw !== ''
                ? (MediaUrl::reference($posterRaw) ?? $posterRaw)
                : null;
            $alt = isset($item['alt']) ? trim((string) $item['alt']) : null;

            $out[] = [
                'type' => $type,
                'aspect' => $aspect,
                'src' => $src,
                'alt' => $alt !== '' ? $alt : null,
                'poster' => $poster,
            ];
        }

        return $out;
    }

    /**
     * Normalize slider images — images only, max 6, fixed 16:9.
     *
     * @param  mixed  $items
     * @return list<array{src: string, alt: ?string}>
     */
    public static function normalizeSlider(mixed $items): array
    {
        if (! is_array($items)) {
            return [];
        }

        $out = [];

        foreach ($items as $item) {
            if (count($out) >= self::SLIDER_MAX) {
                break;
            }
            if (! is_array($item)) {
                continue;
            }

            $srcRaw = isset($item['src']) ? trim((string) $item['src']) : '';
            if ($srcRaw === '') {
                continue;
            }

            $src = MediaUrl::reference($srcRaw) ?? $srcRaw;
            $alt = isset($item['alt']) ? trim((string) $item['alt']) : null;

            $out[] = [
                'src' => $src,
                'alt' => $alt !== '' ? $alt : null,
            ];
        }

        return $out;
    }

    /**
     * Resolve gallery items to portable /storage references (frontend applies CDN + fallback).
     *
     * @param  list<array<string, mixed>>|null  $items
     * @return list<array{type: string, aspect: string, src: string, alt: ?string, poster: ?string}>
     */
    public static function resolve(?array $items): array
    {
        if (! is_array($items) || $items === []) {
            return [];
        }

        $out = [];

        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }

            $srcRaw = isset($item['src']) ? trim((string) $item['src']) : '';
            if ($srcRaw === '') {
                continue;
            }

            $srcRef = MediaUrl::fromDiskPath($srcRaw) ?? $srcRaw;
            $resolvedSrc = MediaUrl::resolve($srcRef, absolute: false);
            if (! filled($resolvedSrc)) {
                continue;
            }

            $poster = null;
            $posterRaw = isset($item['poster']) ? trim((string) $item['poster']) : '';
            if ($posterRaw !== '') {
                $posterRef = MediaUrl::fromDiskPath($posterRaw) ?? $posterRaw;
                $poster = MediaUrl::resolve($posterRef, absolute: false);
            }

            $out[] = [
                'type' => in_array(($item['type'] ?? 'image'), self::TYPES, true) ? $item['type'] : 'image',
                'aspect' => in_array(($item['aspect'] ?? '16:9'), self::ASPECTS, true) ? $item['aspect'] : '16:9',
                'src' => $resolvedSrc,
                'alt' => isset($item['alt']) && filled($item['alt']) ? (string) $item['alt'] : null,
                'poster' => $poster,
            ];
        }

        return $out;
    }

    /**
     * @param  list<array<string, mixed>>|null  $items
     * @return list<array{src: string, alt: ?string}>
     */
    public static function resolveSlider(?array $items): array
    {
        if (! is_array($items) || $items === []) {
            return [];
        }

        $out = [];

        foreach ($items as $item) {
            if (count($out) >= self::SLIDER_MAX) {
                break;
            }
            if (! is_array($item)) {
                continue;
            }

            $srcRaw = isset($item['src']) ? trim((string) $item['src']) : '';
            if ($srcRaw === '') {
                continue;
            }

            $srcRef = MediaUrl::fromDiskPath($srcRaw) ?? $srcRaw;
            $resolvedSrc = MediaUrl::resolve($srcRef, absolute: false);
            if (! filled($resolvedSrc)) {
                continue;
            }

            $out[] = [
                'src' => $resolvedSrc,
                'alt' => isset($item['alt']) && filled($item['alt']) ? (string) $item['alt'] : null,
            ];
        }

        return $out;
    }
}
