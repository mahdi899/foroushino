<?php

namespace App\Services;

use App\Models\Article;
use Illuminate\Support\Str;

/**
 * Lightweight, Yoast-inspired SEO analyzer for articles.
 *
 * Produces a 0..100 score, a poor/ok/good status, and a list of individual
 * checks (each with a title, message, passed flag and weight) so the admin
 * can see exactly what to fix.
 */
class ArticleSeoAnalyzerService
{
    private const STATUS_GOOD = 'good';

    private const STATUS_OK = 'ok';

    private const STATUS_POOR = 'poor';

    /**
     * Run the full analysis and return the raw result without persisting it.
     */
    public function analyze(Article $article): array
    {
        $checks = [];

        $keyword = trim((string) $article->focus_keyword);
        $title = (string) $article->title;
        $slug = (string) $article->slug;
        $metaDescription = (string) $article->meta_description;
        $contentHtml = (string) $article->content;
        $plainText = $this->toPlainText($contentHtml);
        $wordCount = $this->wordCount($plainText);

        $checks[] = $this->hasFocusKeyword($keyword);
        $checks[] = $this->keywordInTitle($keyword, $title);
        $checks[] = $this->keywordInSlug($keyword, $slug);
        $checks[] = $this->keywordInMetaDescription($keyword, $metaDescription);
        $checks[] = $this->keywordInFirstParagraph($keyword, $contentHtml);
        $checks[] = $this->hasHeadings($contentHtml);
        $checks[] = $this->titleLength($title);
        $checks[] = $this->metaDescriptionLength($metaDescription);
        $checks[] = $this->contentLength($wordCount);
        $checks[] = $this->hasInternalLink($contentHtml);
        $checks[] = $this->hasExternalLink($contentHtml);
        $checks[] = $this->hasFeaturedImage($article->featured_image);
        $checks[] = $this->imagesHaveAlt($contentHtml);
        $checks[] = $this->readability($plainText);
        $checks[] = $this->keywordDensity($keyword, $plainText, $wordCount);
        $checks[] = $this->uniqueSlug($article);
        $checks[] = $this->isIndexable($article);

        $score = $this->computeScore($checks);
        $status = $this->statusFromScore($score);

        return [
            'score' => $score,
            'status' => $status,
            'checks' => $checks,
        ];
    }

    /**
     * Run the analysis and persist the result on the article without
     * triggering another slug/model event cycle.
     */
    public function analyzeAndPersist(Article $article): Article
    {
        $result = $this->analyze($article);

        $article->forceFill([
            'seo_score' => $result['score'],
            'seo_status' => $result['status'],
            'seo_checks' => $result['checks'],
        ])->saveQuietly();

        return $article;
    }

    private function computeScore(array $checks): int
    {
        $totalWeight = array_sum(array_column($checks, 'weight'));

        if ($totalWeight === 0) {
            return 0;
        }

        $earned = array_sum(array_map(
            fn (array $check) => $check['passed'] ? $check['weight'] : 0,
            $checks
        ));

        return (int) round(($earned / $totalWeight) * 100);
    }

    private function statusFromScore(int $score): string
    {
        return match (true) {
            $score >= 80 => self::STATUS_GOOD,
            $score >= 50 => self::STATUS_OK,
            default => self::STATUS_POOR,
        };
    }

    private function check(string $key, string $title, bool $passed, string $message, int $weight): array
    {
        return compact('key', 'title', 'passed', 'message', 'weight');
    }

    private function toPlainText(string $html): string
    {
        $text = strip_tags($html);
        $text = html_entity_decode($text, ENT_QUOTES, 'UTF-8');

        return trim(preg_replace('/\s+/u', ' ', $text));
    }

    private function wordCount(string $plainText): int
    {
        if ($plainText === '') {
            return 0;
        }

        return count(preg_split('/\s+/u', $plainText, -1, PREG_SPLIT_NO_EMPTY));
    }

    private function hasFocusKeyword(string $keyword): array
    {
        return $this->check(
            'focus_keyword',
            'کلمه کلیدی اصلی',
            $keyword !== '',
            $keyword !== '' ? 'کلمه کلیدی اصلی مشخص شده است.' : 'کلمه کلیدی اصلی برای این مقاله تعیین نشده است.',
            10
        );
    }

    private function keywordInTitle(string $keyword, string $title): array
    {
        $passed = $keyword !== '' && Str::contains(mb_strtolower($title), mb_strtolower($keyword));

        return $this->check(
            'keyword_in_title',
            'کلمه کلیدی در عنوان',
            $passed,
            $passed ? 'کلمه کلیدی در عنوان مقاله استفاده شده است.' : 'کلمه کلیدی در عنوان مقاله دیده نمی‌شود.',
            8
        );
    }

    private function keywordInSlug(string $keyword, string $slug): array
    {
        $passed = $keyword !== '' && Str::contains(mb_strtolower($slug), Str::slug(mb_strtolower($keyword)));

        return $this->check(
            'keyword_in_slug',
            'کلمه کلیدی در آدرس (slug)',
            $passed,
            $passed ? 'کلمه کلیدی در slug استفاده شده است.' : 'کلمه کلیدی در slug مقاله دیده نمی‌شود.',
            6
        );
    }

    private function keywordInMetaDescription(string $keyword, string $metaDescription): array
    {
        $passed = $keyword !== '' && $metaDescription !== '' && Str::contains(mb_strtolower($metaDescription), mb_strtolower($keyword));

        return $this->check(
            'keyword_in_meta_description',
            'کلمه کلیدی در توضیحات متا',
            $passed,
            $passed ? 'کلمه کلیدی در meta description استفاده شده است.' : 'کلمه کلیدی در meta description دیده نمی‌شود.',
            6
        );
    }

    private function keywordInFirstParagraph(string $keyword, string $contentHtml): array
    {
        $firstParagraph = '';

        if (preg_match('/<p[^>]*>(.*?)<\/p>/is', $contentHtml, $matches)) {
            $firstParagraph = strip_tags($matches[1]);
        } else {
            $firstParagraph = mb_substr($this->toPlainText($contentHtml), 0, 300);
        }

        $passed = $keyword !== '' && $firstParagraph !== '' && Str::contains(mb_strtolower($firstParagraph), mb_strtolower($keyword));

        return $this->check(
            'keyword_in_first_paragraph',
            'کلمه کلیدی در پاراگراف اول',
            $passed,
            $passed ? 'کلمه کلیدی در پاراگراف اول محتوا استفاده شده است.' : 'کلمه کلیدی در پاراگراف اول دیده نمی‌شود.',
            6
        );
    }

    private function hasHeadings(string $contentHtml): array
    {
        $passed = (bool) preg_match('/<h[23][^>]*>/i', $contentHtml);

        return $this->check(
            'has_headings',
            'استفاده از هدینگ‌ها',
            $passed,
            $passed ? 'محتوا از هدینگ H2/H3 استفاده می‌کند.' : 'محتوا فاقد هدینگ‌های H2 یا H3 است.',
            6
        );
    }

    private function titleLength(string $title): array
    {
        $length = mb_strlen($title);
        $passed = $length >= 30 && $length <= 65;

        return $this->check(
            'title_length',
            'طول عنوان',
            $passed,
            $passed ? 'طول عنوان مناسب است.' : "طول عنوان ({$length} کاراکتر) مناسب نیست؛ بین ۳۰ تا ۶۵ کاراکتر باشد.",
            6
        );
    }

    private function metaDescriptionLength(string $metaDescription): array
    {
        $length = mb_strlen($metaDescription);
        $passed = $length >= 80 && $length <= 160;

        return $this->check(
            'meta_description_length',
            'طول توضیحات متا',
            $passed,
            $passed ? 'طول meta description مناسب است.' : "طول meta description ({$length} کاراکتر) مناسب نیست؛ بین ۸۰ تا ۱۶۰ کاراکتر باشد.",
            6
        );
    }

    private function contentLength(int $wordCount): array
    {
        $passed = $wordCount >= 300;

        return $this->check(
            'content_length',
            'طول محتوا',
            $passed,
            $passed ? "محتوا شامل {$wordCount} کلمه است." : "محتوا فقط {$wordCount} کلمه دارد؛ حداقل ۳۰۰ کلمه توصیه می‌شود.",
            8
        );
    }

    private function hasInternalLink(string $contentHtml): array
    {
        $appHost = parse_url((string) config('app.url'), PHP_URL_HOST);
        $passed = false;

        if (preg_match_all('/<a\s[^>]*href=["\']([^"\']+)["\']/i', $contentHtml, $matches)) {
            foreach ($matches[1] as $href) {
                $isRelative = ! Str::startsWith($href, ['http://', 'https://']);
                $isSameHost = $appHost && Str::contains($href, $appHost);

                if ($isRelative || $isSameHost) {
                    $passed = true;
                    break;
                }
            }
        }

        return $this->check(
            'internal_link',
            'لینک داخلی',
            $passed,
            $passed ? 'حداقل یک لینک داخلی در محتوا وجود دارد.' : 'محتوا فاقد لینک داخلی به صفحات دیگر سایت است.',
            4
        );
    }

    private function hasExternalLink(string $contentHtml): array
    {
        $appHost = parse_url((string) config('app.url'), PHP_URL_HOST);
        $passed = false;

        if (preg_match_all('/<a\s[^>]*href=["\']([^"\']+)["\']/i', $contentHtml, $matches)) {
            foreach ($matches[1] as $href) {
                if (Str::startsWith($href, ['http://', 'https://']) && (! $appHost || ! Str::contains($href, $appHost))) {
                    $passed = true;
                    break;
                }
            }
        }

        return $this->check(
            'external_link',
            'لینک خارجی',
            $passed,
            $passed ? 'حداقل یک لینک خارجی معتبر در محتوا وجود دارد.' : 'محتوا فاقد لینک خارجی است.',
            3
        );
    }

    private function hasFeaturedImage(?string $featuredImage): array
    {
        $passed = filled($featuredImage);

        return $this->check(
            'featured_image',
            'تصویر شاخص',
            $passed,
            $passed ? 'تصویر شاخص برای مقاله تنظیم شده است.' : 'تصویر شاخص برای مقاله تنظیم نشده است.',
            6
        );
    }

    private function imagesHaveAlt(string $contentHtml): array
    {
        if (! preg_match_all('/<img\s[^>]*>/i', $contentHtml, $matches)) {
            return $this->check(
                'images_alt',
                'alt تصاویر محتوا',
                true,
                'محتوا تصویری ندارد؛ این مورد رد نمی‌شود.',
                4
            );
        }

        $missingAlt = 0;

        foreach ($matches[0] as $imgTag) {
            if (! preg_match('/alt=["\']([^"\']*)["\']/i', $imgTag, $altMatch) || trim($altMatch[1]) === '') {
                $missingAlt++;
            }
        }

        $passed = $missingAlt === 0;

        return $this->check(
            'images_alt',
            'alt تصاویر محتوا',
            $passed,
            $passed ? 'همه تصاویر محتوا دارای متن alt هستند.' : "{$missingAlt} تصویر بدون متن alt در محتوا وجود دارد.",
            4
        );
    }

    private function readability(string $plainText): array
    {
        if ($plainText === '') {
            return $this->check('readability', 'خوانایی متن', false, 'محتوایی برای بررسی خوانایی وجود ندارد.', 5);
        }

        $sentences = preg_split('/[.!؟?]+/u', $plainText, -1, PREG_SPLIT_NO_EMPTY);
        $sentenceCount = max(count($sentences), 1);
        $wordCount = $this->wordCount($plainText);
        $avgWordsPerSentence = $wordCount / $sentenceCount;

        // Simple heuristic: shorter sentences are easier to read in Persian too.
        $passed = $avgWordsPerSentence <= 25;

        return $this->check(
            'readability',
            'خوانایی متن',
            $passed,
            $passed
                ? 'میانگین طول جملات مناسب و متن نسبتاً خوانا است.'
                : 'جملات محتوا طولانی هستند؛ برای خوانایی بهتر جملات کوتاه‌تری بنویسید.',
            5
        );
    }

    private function keywordDensity(string $keyword, string $plainText, int $wordCount): array
    {
        if ($keyword === '' || $wordCount === 0) {
            return $this->check('keyword_density', 'تراکم کلمه کلیدی', false, 'امکان محاسبه تراکم کلمه کلیدی وجود ندارد.', 4);
        }

        $occurrences = $this->mbSubstrCount(mb_strtolower($plainText), mb_strtolower($keyword));
        $density = ($occurrences / $wordCount) * 100;

        $passed = $density > 0 && $density <= 2.5;

        return $this->check(
            'keyword_density',
            'تراکم کلمه کلیدی',
            $passed,
            $passed
                ? sprintf('تراکم کلمه کلیدی (%.1f%%) مناسب است.', $density)
                : sprintf('تراکم کلمه کلیدی (%.1f%%) مناسب نیست؛ از تکرار بیش از حد یا نبود آن پرهیز کنید.', $density),
            4
        );
    }

    private function mbSubstrCount(string $haystack, string $needle): int
    {
        if ($needle === '') {
            return 0;
        }

        $count = 0;
        $offset = 0;
        $needleLength = mb_strlen($needle);

        while (($position = mb_strpos($haystack, $needle, $offset)) !== false) {
            $count++;
            $offset = $position + $needleLength;
        }

        return $count;
    }

    private function uniqueSlug(Article $article): array
    {
        $passed = true;

        if (filled($article->slug)) {
            $passed = ! Article::query()
                ->where('slug', $article->slug)
                ->when($article->exists, fn ($q) => $q->whereKeyNot($article->getKey()))
                ->exists();
        }

        return $this->check(
            'unique_slug',
            'یکتا بودن آدرس (slug)',
            $passed,
            $passed ? 'slug مقاله یکتا است.' : 'یک مقاله دیگر با همین slug وجود دارد.',
            5
        );
    }

    private function isIndexable(Article $article): array
    {
        $passed = (bool) $article->is_indexable;

        return $this->check(
            'indexable',
            'قابل ایندکس بودن',
            $passed,
            $passed ? 'مقاله برای موتورهای جستجو قابل ایندکس است.' : 'مقاله به‌صورت noindex علامت‌گذاری شده است.',
            3
        );
    }
}
