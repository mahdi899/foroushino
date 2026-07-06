<?php

namespace Tests\Feature;

use App\Jobs\GenerateArticleJob;
use App\Models\AiSetting;
use App\Models\Article;
use App\Services\AIService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ArticleGenerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_generate_article_job_creates_a_draft_article_from_the_ai_response(): void
    {
        AiSetting::current()->update([
            'is_active' => true,
            'api_key' => 'test-api-key',
            'model' => 'gpt-4o-mini',
        ]);

        $aiPayload = [
            'title' => 'راهنمای شروع کمپین‌نویسی',
            'slug' => 'campaign-writing-guide',
            'meta_title' => 'راهنمای شروع کمپین‌نویسی حرفه‌ای',
            'meta_description' => 'در این راهنما یاد می‌گیرید چطور یک کمپین‌نویسی حرفه‌ای بسازید.',
            'excerpt' => 'خلاصه‌ای کوتاه از راهنما.',
            'content' => '<p>محتوای تولید شده توسط هوش مصنوعی.</p><h2>بخش اول</h2><p>ادامه‌ی محتوا.</p>',
            'faq' => [
                ['question' => 'این دوره برای چه کسانی است؟', 'answer' => 'برای همه‌ی علاقه‌مندان به کمپین‌نویسی.'],
            ],
        ];

        Http::fake([
            'api.openai.com/*' => Http::response([
                'choices' => [
                    ['message' => ['content' => json_encode($aiPayload, JSON_UNESCAPED_UNICODE)]],
                ],
            ], 200),
        ]);

        $job = new GenerateArticleJob([
            'topic' => 'کمپین‌نویسی',
            'focus_keyword' => 'کمپین‌نویسی',
            'word_count' => 500,
        ]);

        $job->handle(app(AIService::class));

        $this->assertDatabaseCount('articles', 1);

        $article = Article::first();
        $this->assertSame('راهنمای شروع کمپین‌نویسی', $article->title);
        $this->assertSame('draft', $article->status);
        $this->assertSame('کمپین‌نویسی', $article->focus_keyword);
        $this->assertStringContainsString('سوالات متداول', $article->content);
        $this->assertNotNull($article->seo_score);
    }

    public function test_generate_article_job_does_not_crash_when_ai_service_is_not_configured(): void
    {
        // AiSetting left at its inactive default (no api_key, is_active=false).
        $job = new GenerateArticleJob([
            'topic' => 'موضوع آزمایشی',
            'focus_keyword' => 'آزمایشی',
        ]);

        $job->handle(app(AIService::class));

        $this->assertDatabaseCount('articles', 0);
    }

    public function test_generate_article_job_handles_malformed_ai_responses_gracefully(): void
    {
        AiSetting::current()->update([
            'is_active' => true,
            'api_key' => 'test-api-key',
        ]);

        Http::fake([
            'api.openai.com/*' => Http::response([
                'choices' => [
                    ['message' => ['content' => 'این یک پاسخ نامعتبر بدون ساختار JSON است.']],
                ],
            ], 200),
        ]);

        $job = new GenerateArticleJob([
            'topic' => 'موضوع آزمایشی',
            'focus_keyword' => 'آزمایشی',
        ]);

        $job->handle(app(AIService::class));

        $this->assertDatabaseCount('articles', 0);
    }
}
