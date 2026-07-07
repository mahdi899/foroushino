<?php

namespace App\Support;

use App\Services\MediaAltResolver;
use App\Services\MediaMetadataResolver;

final class HtmlImageEnricher
{
    public function __construct(
        private readonly MediaAltResolver $altResolver,
        private readonly MediaMetadataResolver $metadataResolver,
    ) {
    }

    /**
     * Resolve media URLs and inject alt, dimensions, and lazy-loading on inline images.
     * Portable /storage/... refs in DB are resolved at read time for static HTML output.
     */
    public function enrich(string $html): string
    {
        if (trim($html) === '') {
            return $html;
        }

        return (string) preg_replace_callback(
            '/<img\b([^>]*?)>/iu',
            function (array $matches): string {
                $attrs = $matches[1];
                $src = $this->attrValue($attrs, 'src');
                if ($src === null || trim($src) === '') {
                    return $matches[0];
                }

                $reference = MediaUrl::reference($src) ?? $src;
                $resolvedSrc = MediaUrl::resolve($src) ?? $src;
                $attrs = $this->setAttr($attrs, 'src', $resolvedSrc);

                $meta = $this->metadataResolver->lookup($reference);

                $existingAlt = $this->attrValue($attrs, 'alt');
                $altFromMeta = is_array($meta) ? ($meta['alt'] ?? null) : null;
                $alt = $existingAlt !== null && trim($existingAlt) !== ''
                    ? trim($existingAlt)
                    : ($altFromMeta ?: $this->altResolver->resolve($src));

                $attrs = $this->setAttr($attrs, 'alt', $alt);

                if ($this->attrValue($attrs, 'width') === null && is_array($meta) && ($meta['width'] ?? null)) {
                    $attrs = $this->setAttr($attrs, 'width', (string) $meta['width']);
                }
                if ($this->attrValue($attrs, 'height') === null && is_array($meta) && ($meta['height'] ?? null)) {
                    $attrs = $this->setAttr($attrs, 'height', (string) $meta['height']);
                }

                if ($this->attrValue($attrs, 'loading') === null) {
                    $attrs .= ' loading="lazy"';
                }
                if ($this->attrValue($attrs, 'decoding') === null) {
                    $attrs .= ' decoding="async"';
                }

                return '<img'.$attrs.'>';
            },
            $html,
        );
    }

    private function attrValue(string $attrs, string $name): ?string
    {
        if (preg_match('/\b'.preg_quote($name, '/').'\s*=\s*(["\'])(.*?)\1/iu', $attrs, $m)) {
            return html_entity_decode($m[2], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }

        return null;
    }

    private function setAttr(string $attrs, string $name, string $value): string
    {
        $escaped = htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        if (preg_match('/\b'.preg_quote($name, '/').'\s*=\s*(["\']).*?\1/iu', $attrs)) {
            return (string) preg_replace(
                '/\b'.preg_quote($name, '/').'\s*=\s*(["\']).*?\1/iu',
                $name.'="'.$escaped.'"',
                $attrs,
                1,
            );
        }

        return rtrim($attrs).' '.$name.'="'.$escaped.'"';
    }
}
