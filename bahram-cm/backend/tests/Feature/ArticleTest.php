<?php

namespace Tests\Feature;

use App\Models\Article;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArticleTest extends TestCase
{
    use RefreshDatabase;

    public function test_article_can_be_created_with_an_auto_generated_slug(): void
    {
        $article = Article::create([
            'title' => 'مقاله آزمایشی برای تست',
            'excerpt' => 'خلاصه‌ی کوتاه.',
            'content' => '<p>محتوای آزمایشی.</p>',
            'status' => 'draft',
        ]);

        $this->assertNotEmpty($article->slug);
        $this->assertSame('draft', $article->status);
        $this->assertDatabaseHas('articles', ['id' => $article->id]);
    }

    public function test_article_content_is_sanitized_on_save(): void
    {
        $article = Article::create([
            'title' => 'مقاله با اسکریپت مخرب',
            'content' => '<p>سلام</p><script>alert(1)</script>',
            'status' => 'draft',
        ]);

        $this->assertStringNotContainsString('<script', $article->fresh()->content);
    }

    public function test_saving_an_article_computes_seo_score_and_status(): void
    {
        $article = Article::create([
            'title' => 'راهنمای کامل بازاریابی محتوایی برای کسب‌وکارها',
            'slug' => 'complete-content-marketing-guide',
            'excerpt' => 'خلاصه‌ای از راهنمای بازاریابی محتوایی.',
            'meta_title' => 'راهنمای کامل بازاریابی محتوایی برای رشد کسب‌وکار',
            'meta_description' => str_repeat('بازاریابی محتوایی به رشد کسب‌وکار شما کمک می‌کند و در این راهنما همه چیز را یاد می‌گیرید. ', 2),
            'focus_keyword' => 'بازاریابی محتوایی',
            'content' => '<p>بازاریابی محتوایی یکی از موثرترین روش‌های رشد کسب‌وکار است.</p>'
                .'<h2>چرا بازاریابی محتوایی مهم است</h2>'
                .'<p>'.str_repeat('این یک جمله‌ی نمونه برای افزایش طول محتوا و بررسی خوانایی متن است. ', 60).'</p>'
                .'<p>برای مطالعه بیشتر به <a href="/articles">مقالات دیگر</a> یا <a href="https://example.com">منابع خارجی</a> مراجعه کنید.</p>',
            'featured_image' => 'articles/cover.jpg',
            'is_indexable' => true,
            'status' => 'published',
            'published_at' => now(),
        ]);

        $article->refresh();

        $this->assertNotNull($article->seo_score);
        $this->assertContains($article->seo_status, ['poor', 'ok', 'good']);
        $this->assertIsArray($article->seo_checks);
        $this->assertNotEmpty($article->seo_checks);
        $this->assertGreaterThanOrEqual(50, $article->seo_score);
    }

    public function test_thin_unoptimized_article_gets_a_poor_seo_score(): void
    {
        $article = Article::create([
            'title' => 'یادداشت',
            'content' => '<p>یک متن خیلی کوتاه.</p>',
            'status' => 'draft',
            'is_indexable' => false,
        ]);

        $article->refresh();

        $this->assertSame('poor', $article->seo_status);
        $this->assertLessThan(50, $article->seo_score);
    }

    public function test_published_articles_endpoint_only_returns_published_and_due_articles(): void
    {
        Article::create([
            'title' => 'مقاله منتشر شده',
            'slug' => 'published-article',
            'content' => '<p>محتوا</p>',
            'status' => 'published',
            'published_at' => now()->subDay(),
        ]);

        Article::create([
            'title' => 'مقاله پیش‌نویس',
            'slug' => 'draft-article',
            'content' => '<p>محتوا</p>',
            'status' => 'draft',
        ]);

        Article::create([
            'title' => 'مقاله زمان‌بندی‌شده در آینده',
            'slug' => 'future-article',
            'content' => '<p>محتوا</p>',
            'status' => 'published',
            'published_at' => now()->addDay(),
        ]);

        $response = $this->getJson('/api/articles');

        $response->assertOk();
        $slugs = collect($response->json('data'))->pluck('slug');
        $this->assertTrue($slugs->contains('published-article'));
        $this->assertFalse($slugs->contains('draft-article'));
        $this->assertFalse($slugs->contains('future-article'));
    }

    public function test_show_endpoint_returns_404_for_unpublished_article(): void
    {
        Article::create([
            'title' => 'مقاله پیش‌نویس',
            'slug' => 'draft-only',
            'content' => '<p>محتوا</p>',
            'status' => 'draft',
        ]);

        $response = $this->getJson('/api/articles/draft-only');

        $response->assertNotFound();
        $response->assertJsonPath('error.code', 'article_not_found');
    }
}
