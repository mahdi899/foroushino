<?php

namespace App\Services;

use App\Support\ArticleSlug;
use App\Support\RuntimeCache;
use App\Models\Faq;

/**
 * Purge ISR + Laravel object cache when static content is published or updated.
 */
class ContentPublishService
{
    public function __construct(
        private readonly RevalidationService $revalidation,
        private readonly CacheService $cacheService,
    ) {}

    public function revalidateArticles(?string $slug = null, ?string $previousSlug = null): void
    {
        $paths = ['/insights', '/sitemap.xml', '/sitemaps'];
        foreach (array_filter([$slug, $previousSlug]) as $s) {
            $paths[] = '/insights/'.$s;
        }

        $this->purge(
            'ذخیره مقاله',
            ['articles', 'seo'],
            array_values(array_unique($paths)),
            fn () => $this->forgetArticleRuntimeCache($slug, $previousSlug),
        );
    }

    public function revalidateTestimonials(?string $slug = null, ?string $previousSlug = null): void
    {
        $paths = ['/transformations'];
        foreach (array_filter([$slug, $previousSlug]) as $s) {
            $paths[] = '/transformations/'.$s;
        }

        $this->purge(
            'ذخیره نظر / تبدیل',
            ['testimonials', 'public-transformations'],
            array_values(array_unique($paths)),
            fn () => $this->forgetTestimonialRuntimeCache($slug, $previousSlug),
        );
    }

    public function revalidateFaqs(): void
    {
        $this->purge(
            'ذخیره سوال متداول',
            ['faqs', 'public-faqs'],
            ['/faq'],
            fn () => $this->forgetFaqRuntimeCache(),
        );
    }

    public function revalidateMedia(?string $detail = null): void
    {
        $label = $detail ? "بروزرسانی رسانه — {$detail}" : 'بروزرسانی رسانه';
        $this->purge(
            $label,
            ['settings', 'articles', 'cases', 'testimonials'],
            ['/', '/insights', '/transformations'],
            null,
            purgeMediaCdn: true,
        );
    }

    public function revalidateProducts(?string $slug = null): void
    {
        $paths = ['/', '/courses', '/mini-courses'];
        if ($slug) {
            $paths[] = '/courses/'.$slug;
            $paths[] = '/purchase/'.$slug;
        }

        $this->purge(
            'ذخیره محصول',
            ['pricing', 'services', 'settings'],
            array_values(array_unique($paths)),
            fn () => $this->forgetProductRuntimeCache($slug),
        );
    }

    public function revalidateMiniCourses(?string $slug = null, ?string $previousSlug = null): void
    {
        $paths = ['/courses', '/mini-courses', '/sitemap.xml'];
        foreach (array_filter([$slug, $previousSlug]) as $s) {
            $paths[] = '/mini-courses/'.$s;
        }

        $this->purge(
            'ذخیره مینی‌دوره',
            ['mini-courses', 'public-mini-courses', 'content-comments'],
            array_values(array_unique($paths)),
            fn () => $this->forgetMiniCourseRuntimeCache($slug, $previousSlug),
        );
    }

    public function revalidateSeminars(?string $slug = null, ?string $previousSlug = null): void
    {
        $paths = ['/seminars'];
        foreach (array_filter([$slug, $previousSlug]) as $s) {
            $paths[] = '/seminars/'.$s;
        }

        $this->purge(
            'ذخیره سمینار',
            ['seminars', 'services'],
            array_values(array_unique($paths)),
            fn () => $this->forgetSeminarRuntimeCache($slug, $previousSlug),
        );
    }

    public function revalidateContentComments(string $type, ?string $slug = null): void
    {
        $paths = match ($type) {
            'course' => array_filter(['/courses', $slug ? '/courses/'.$slug : null]),
            'mini_course' => array_filter(['/mini-courses', $slug ? '/mini-courses/'.$slug : null]),
            'article' => array_filter(['/insights', $slug ? '/insights/'.$slug : null]),
            'seminar' => array_filter(['/seminars', $slug ? '/seminars/'.$slug : null]),
            'campaign_writing' => array_filter(['/course/campaign-writing']),
            default => [],
        };

        $this->purge(
            'تأیید یا ثبت نظر',
            ['content-comments', 'mini-courses', 'public-mini-courses', 'articles'],
            array_values(array_unique($paths)),
            fn () => $this->forgetContentCommentRuntimeCache($type, $slug),
        );
    }

    public function revalidateSiteSettings(string $group): void
    {
        if ($group === 'cache') {
            return;
        }

        $this->purge(
            "بروزرسانی تنظیمات — {$group}",
            ['settings', 'seo'],
            ['/'],
            null,
        );
    }

    /**
     * @param  null|callable(): void  $afterForget
     */
    private function purge(
        string $label,
        array $tags,
        array $paths,
        ?callable $afterForget,
        bool $purgeMediaCdn = false,
    ): void {
        if (! $this->shouldAutoPurge()) {
            return;
        }

        $this->revalidation->trigger($tags, $paths);

        $settings = $this->cacheService->getSettings();
        $cdn = $this->cacheService->purgeCdnOnAutoSave($paths, $purgeMediaCdn);

        $this->cacheService->logAutoPurge($label, $tags, $paths, $cdn);

        if ($afterForget) {
            $afterForget();
        }
    }

    private function shouldAutoPurge(): bool
    {
        $settings = $this->cacheService->getSettings();

        return (bool) ($settings['auto_purge_on_save'] ?? true);
    }

    private function forgetArticleRuntimeCache(?string $slug, ?string $previousSlug = null): void
    {
        foreach (array_filter([$slug, $previousSlug]) as $s) {
            RuntimeCache::forget('public_articles:show:'.ArticleSlug::normalize($s));
        }

        for ($page = 1; $page <= 10; $page++) {
            foreach ([9, 12, 25, 50, 100] as $perPage) {
                RuntimeCache::forget("public_articles:index:{$page}:{$perPage}");
            }
        }
    }

    private function forgetTestimonialRuntimeCache(?string $slug, ?string $previousSlug = null): void
    {
        foreach (array_filter([$slug, $previousSlug]) as $s) {
            RuntimeCache::forget('public_transformations:show:'.$s);
        }

        for ($page = 1; $page <= 10; $page++) {
            foreach ([9, 25, 100] as $perPage) {
                RuntimeCache::forget('public_transformations:index:'.$page.':'.$perPage.':');
                RuntimeCache::forget('public_transformations:index:'.$page.':'.$perPage.':'.md5(''));
            }
        }
    }

    private function forgetFaqRuntimeCache(): void
    {
        RuntimeCache::forget('public.faqs');

        $categories = Faq::query()
            ->distinct()
            ->pluck('category')
            ->filter(fn ($category) => is_string($category) && $category !== '');

        foreach ($categories as $category) {
            RuntimeCache::forget("public.faqs.{$category}");
        }
    }

    private function forgetMiniCourseRuntimeCache(?string $slug, ?string $previousSlug = null): void
    {
        RuntimeCache::forget('public_mini_courses:index');

        foreach (array_filter([$slug, $previousSlug]) as $s) {
            RuntimeCache::forget('public_mini_courses:show:'.$s);
            RuntimeCache::forget('public_mini_courses:comments:'.$s);
            RuntimeCache::forget('public_content_comments:mini_course:'.$s);
        }
    }

    private function forgetContentCommentRuntimeCache(string $type, ?string $slug = null): void
    {
        if ($slug) {
            RuntimeCache::forget("public_content_comments:{$type}:{$slug}");
        }

        if ($type === 'mini_course' && $slug) {
            RuntimeCache::forget('public_mini_courses:comments:'.$slug);
        }
    }

    private function forgetProductRuntimeCache(?string $slug = null): void
    {
        RuntimeCache::forget('public_products:index:all');
        RuntimeCache::forget('public_products:index:listed');

        if ($slug) {
            RuntimeCache::forget('public_products:show:'.$slug);
        }
    }

    private function forgetSeminarRuntimeCache(?string $slug, ?string $previousSlug = null): void
    {
        RuntimeCache::forget('public_seminars:promo');

        foreach (array_filter([$slug, $previousSlug]) as $s) {
            RuntimeCache::forget('public_seminars:show:'.$s);
        }
    }
}
