<?php

namespace App\Services;

use App\Models\Article;
use App\Models\Product;
use App\Models\SeoSetting;

/**
 * Builds sitemap.xml from published articles and active products, and
 * persists it (together with robots.txt) on the seo_settings singleton so
 * the public routes and the admin preview always agree.
 */
class SitemapService
{
    public function regenerate(): SeoSetting
    {
        $urls = collect();

        $urls->push([
            'loc' => rtrim((string) config('app.frontend_url'), '/').'/',
            'changefreq' => 'daily',
            'priority' => '1.0',
        ]);

        Article::query()
            ->published()
            ->orderByDesc('published_at')
            ->get(['slug', 'updated_at'])
            ->each(function (Article $article) use ($urls) {
                $urls->push([
                    'loc' => rtrim((string) config('app.frontend_url'), '/')."/articles/{$article->slug}",
                    'lastmod' => optional($article->updated_at)->toAtomString(),
                    'changefreq' => 'weekly',
                    'priority' => '0.7',
                ]);
            });

        Product::query()
            ->active()
            ->orderByDesc('updated_at')
            ->get(['slug', 'updated_at'])
            ->each(function (Product $product) use ($urls) {
                $urls->push([
                    'loc' => rtrim((string) config('app.frontend_url'), '/')."/purchase/{$product->slug}",
                    'lastmod' => optional($product->updated_at)->toAtomString(),
                    'changefreq' => 'weekly',
                    'priority' => '0.8',
                ]);
            });

        $xml = $this->buildXml($urls);

        $settings = SeoSetting::current();
        $settings->update([
            'sitemap_xml' => $xml,
            'sitemap_generated_at' => now(),
        ]);

        return $settings->fresh();
    }

    /**
     * Return the currently stored sitemap, generating it on first access.
     */
    public function current(): string
    {
        $settings = SeoSetting::current();

        if (blank($settings->sitemap_xml)) {
            return $this->regenerate()->sitemap_xml;
        }

        return $settings->sitemap_xml;
    }

    public function defaultRobotsTxt(): string
    {
        $sitemapUrl = rtrim((string) config('app.frontend_url'), '/').'/sitemap.xml';

        return "User-agent: *\nAllow: /\n\nSitemap: {$sitemapUrl}\n";
    }

    /**
     * @param  \Illuminate\Support\Collection<int, array{loc: string, lastmod?: ?string, changefreq: string, priority: string}>  $urls
     */
    private function buildXml($urls): string
    {
        $entries = $urls->map(function (array $url) {
            $loc = e($url['loc']);
            $lastmod = filled($url['lastmod'] ?? null) ? "<lastmod>{$url['lastmod']}</lastmod>" : '';
            $changefreq = e($url['changefreq']);
            $priority = e($url['priority']);

            return "  <url><loc>{$loc}</loc>{$lastmod}<changefreq>{$changefreq}</changefreq><priority>{$priority}</priority></url>";
        })->implode("\n");

        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n".
            "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n".
            $entries."\n".
            "</urlset>\n";
    }
}
