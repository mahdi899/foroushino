<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\Faq;
use App\Models\Product;
use App\Models\SeoSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_faqs_endpoint_returns_only_active_faqs_in_order(): void
    {
        Faq::create(['question' => 'سوال دوم', 'answer' => 'پاسخ دوم', 'sort_order' => 2, 'is_active' => true]);
        Faq::create(['question' => 'سوال اول', 'answer' => 'پاسخ اول', 'sort_order' => 1, 'is_active' => true]);
        Faq::create(['question' => 'سوال غیرفعال', 'answer' => 'پاسخ', 'sort_order' => 0, 'is_active' => false]);

        $response = $this->getJson('/api/faqs');

        $response->assertOk();
        $questions = collect($response->json('data'))->pluck('question');
        $this->assertSame(['سوال اول', 'سوال دوم'], $questions->all());
    }

    public function test_faqs_endpoint_can_filter_by_category(): void
    {
        Faq::create(['question' => 'سوال عمومی', 'answer' => 'پاسخ', 'category' => 'general', 'is_active' => true]);
        Faq::create(['question' => 'سوال دوره', 'answer' => 'پاسخ', 'category' => 'course', 'is_active' => true]);

        $response = $this->getJson('/api/faqs?category=course');

        $response->assertOk();
        $questions = collect($response->json('data'))->pluck('question');
        $this->assertSame(['سوال دوره'], $questions->all());
    }

    public function test_products_endpoint_only_returns_active_products(): void
    {
        Product::create(['title' => 'محصول فعال', 'type' => 'normal', 'price' => 100000, 'is_active' => true]);
        Product::create(['title' => 'محصول غیرفعال', 'type' => 'normal', 'price' => 100000, 'is_active' => false]);

        $response = $this->getJson('/api/products');

        $response->assertOk();
        $titles = collect($response->json('data'))->pluck('title');
        $this->assertTrue($titles->contains('محصول فعال'));
        $this->assertFalse($titles->contains('محصول غیرفعال'));
    }

    public function test_product_show_endpoint_returns_a_single_active_product_by_slug(): void
    {
        $product = Product::create([
            'title' => 'دوره کامل بازاریابی',
            'type' => 'package',
            'price' => 2500000,
            'is_active' => true,
        ]);

        $response = $this->getJson("/api/products/{$product->slug}");

        $response->assertOk();
        $response->assertJsonPath('data.slug', $product->slug);
    }

    public function test_product_show_endpoint_returns_404_for_inactive_product(): void
    {
        $product = Product::create([
            'title' => 'محصول غیرفعال',
            'type' => 'normal',
            'price' => 100000,
            'is_active' => false,
        ]);

        $response = $this->getJson("/api/products/{$product->slug}");

        $response->assertNotFound();
        $response->assertJsonPath('error.code', 'product_not_found');
    }

    public function test_sitemap_includes_published_articles_and_active_products(): void
    {
        Article::create([
            'title' => 'مقاله منتشر شده برای سایت‌مپ',
            'slug' => 'sitemap-article',
            'content' => '<p>محتوا</p>',
            'status' => 'published',
            'published_at' => now()->subHour(),
        ]);

        Product::create([
            'title' => 'محصول سایت‌مپ',
            'slug' => 'sitemap-product',
            'type' => 'normal',
            'price' => 100000,
            'is_active' => true,
        ]);

        $response = $this->get('/sitemap.xml');

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/xml');
        $response->assertSee('sitemap-article', false);
        $response->assertSee('/purchase/sitemap-product', false);
    }

    public function test_robots_txt_reflects_admin_configured_content(): void
    {
        SeoSetting::current()->update([
            'robots_txt' => "User-agent: *\nDisallow: /admin",
        ]);

        $response = $this->get('/robots.txt');

        $response->assertOk();
        $response->assertSee('Disallow: /admin', false);
    }
}
