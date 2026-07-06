<?php

namespace App\Jobs;

use App\Models\Article;
use App\Services\AIService;
use App\Services\Exceptions\AiServiceException;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Generates a fully drafted, SEO-oriented article via the central AIService
 * and stores it as a draft Article. The Article model automatically runs the
 * SEO analyzer once the record is saved.
 */
class GenerateArticleJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public int $timeout = 180;

    /**
     * @param  array{topic: string, focus_keyword: string, secondary_keywords?: ?string, tone?: ?string, audience?: ?string, word_count?: ?int, custom_prompt?: ?string}  $input
     */
    public function __construct(
        public array $input,
        public ?int $authorId = null,
    ) {}

    public function handle(AIService $ai): void
    {
        try {
            $reply = $ai->chat([
                ['role' => 'system', 'content' => $this->systemPrompt()],
                ['role' => 'user', 'content' => $this->userPrompt()],
            ], [
                'max_tokens' => $this->estimateMaxTokens(),
            ]);

            $data = $this->parseJsonReply($reply);

            $title = trim((string) ($data['title'] ?? $this->input['topic']));
            $content = (string) ($data['content'] ?? '');

            if (blank($content)) {
                throw new AiServiceException('پاسخ هوش مصنوعی فاقد محتوای مقاله بود.');
            }

            $content = $this->appendFaqSection($content, $data['faq'] ?? []);

            Article::create([
                'title' => $title,
                'slug' => $this->uniqueSlug($data['slug'] ?? $title),
                'excerpt' => $data['excerpt'] ?? null,
                'content' => $content,
                'meta_title' => $data['meta_title'] ?? $title,
                'meta_description' => $data['meta_description'] ?? null,
                'focus_keyword' => $this->input['focus_keyword'] ?? null,
                'status' => 'draft',
                'author_id' => $this->authorId,
            ]);
        } catch (AiServiceException $e) {
            Log::channel('ai')->error('AI article generation failed.', [
                'message' => $e->getMessage(),
                'input' => $this->input,
            ]);
        } catch (\Throwable $e) {
            Log::channel('ai')->error('AI article generation crashed unexpectedly.', [
                'message' => $e->getMessage(),
                'input' => $this->input,
            ]);
        }
    }

    private function systemPrompt(): string
    {
        return <<<'PROMPT'
            تو یک متخصص تولید محتوای سئو شده به زبان فارسی هستی. باید یک مقاله کامل، منحصربه‌فرد و بهینه برای موتورهای جستجو تولید کنی.
            خروجی تو باید فقط و فقط یک JSON معتبر با کلیدهای زیر باشد و هیچ متن اضافه‌ای (توضیح، مقدمه، Markdown fence) قبل یا بعد از آن نباشد:

            {
              "title": "عنوان پیشنهادی مقاله",
              "slug": "پیشنهادی-به-صورت-لاتین-و-خط-تیره",
              "meta_title": "meta title مناسب زیر 65 کاراکتر",
              "meta_description": "meta description مناسب بین 80 تا 160 کاراکتر",
              "excerpt": "خلاصه کوتاه مقاله در 1 تا 2 جمله",
              "content": "محتوای کامل مقاله با HTML تمیز شامل h2/h3، پاراگراف‌های p، لیست‌ها در صورت نیاز",
              "faq": [{"question": "...", "answer": "..."}]
            }

            نکات مهم:
            - محتوای HTML باید فقط از تگ‌های ساده و امن استفاده کند: h2, h3, p, ul, ol, li, strong, em, a, blockquote.
            - کلمه کلیدی اصلی باید در عنوان، پاراگراف اول و حداقل یکی از هدینگ‌ها به‌طور طبیعی استفاده شود.
            - از تکرار غیرطبیعی کلمه کلیدی خودداری کن.
            - در صورت مرتبط بودن، حداکثر 3 سوال متداول در فیلد faq اضافه کن، در غیر این صورت آرایه faq را خالی بگذار.
            PROMPT;
    }

    private function userPrompt(): string
    {
        $secondaryKeywords = trim((string) ($this->input['secondary_keywords'] ?? ''));
        $tone = $this->input['tone'] ?? 'حرفه‌ای و قابل‌فهم';
        $audience = $this->input['audience'] ?? 'عموم مخاطبان فارسی‌زبان';
        $wordCount = (int) ($this->input['word_count'] ?? 800);
        $customPrompt = trim((string) ($this->input['custom_prompt'] ?? ''));

        $lines = [
            'موضوع مقاله: '.$this->input['topic'],
            'کلمه کلیدی اصلی: '.($this->input['focus_keyword'] ?? ''),
            $secondaryKeywords !== '' ? 'کلمات کلیدی فرعی: '.$secondaryKeywords : null,
            'لحن نوشتار: '.$tone,
            'مخاطب هدف: '.$audience,
            'تعداد تقریبی کلمات: '.$wordCount,
            $customPrompt !== '' ? 'توضیحات اضافی مدیر: '.$customPrompt : null,
        ];

        return implode("\n", array_filter($lines));
    }

    private function estimateMaxTokens(): int
    {
        $wordCount = (int) ($this->input['word_count'] ?? 800);

        // Rough heuristic: ~2 tokens per word for Persian text, plus headroom for JSON structure.
        return (int) min(max($wordCount * 2, 800), 6000);
    }

    /**
     * @return array<string, mixed>
     */
    private function parseJsonReply(string $reply): array
    {
        $cleaned = trim($reply);
        $cleaned = preg_replace('/^```(?:json)?/i', '', $cleaned);
        $cleaned = preg_replace('/```$/', '', $cleaned);
        $cleaned = trim((string) $cleaned);

        $decoded = json_decode($cleaned, true);

        if (json_last_error() !== JSON_ERROR_NONE || ! is_array($decoded)) {
            // Fallback: try to extract the first {...} block from the reply.
            if (preg_match('/\{.*\}/s', $cleaned, $matches)) {
                $decoded = json_decode($matches[0], true);
            }
        }

        if (! is_array($decoded)) {
            throw new AiServiceException('پاسخ هوش مصنوعی در قالب JSON معتبر نبود.');
        }

        return $decoded;
    }

    /**
     * @param  array<int, array{question?: string, answer?: string}>  $faqItems
     */
    private function appendFaqSection(string $content, array $faqItems): string
    {
        $faqItems = array_filter($faqItems, fn ($item) => filled($item['question'] ?? null) && filled($item['answer'] ?? null));

        if (empty($faqItems)) {
            return $content;
        }

        $html = '<h2>سوالات متداول</h2>';

        foreach ($faqItems as $item) {
            $question = e($item['question']);
            $answer = e($item['answer']);
            $html .= "<h3>{$question}</h3><p>{$answer}</p>";
        }

        return $content."\n".$html;
    }

    private function uniqueSlug(string $source): string
    {
        $base = Str::slug($source) ?: Str::slug($this->input['topic'] ?? 'article');
        $slug = $base;
        $suffix = 1;

        while (Article::query()->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
