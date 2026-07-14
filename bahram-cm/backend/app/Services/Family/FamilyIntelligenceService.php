<?php

namespace App\Services\Family;

use App\Enums\Family\FamilyLifecycle;
use App\Models\Family;
use App\Models\FamilyComment;
use App\Services\AIService;
use App\Services\Exceptions\AiServiceException;
use Illuminate\Support\Facades\Log;

class FamilyIntelligenceService
{
    public function __construct(
        private readonly AIService $ai,
    ) {}

    /**
     * @return array{risk_score?: float, sentiment?: string, topic?: string, signals?: list<string>}
     */
    public function analyzeComment(string $body): array
    {
        if (! $this->ai->isConfigured()) {
            return $this->heuristicCommentAnalysis($body);
        }

        try {
            $raw = $this->ai->chat([
                ['role' => 'system', 'content' => 'You are a Family Analyst for a Persian coaching community. Return ONLY compact JSON with keys: risk_score (0-1), sentiment (positive|neutral|negative), topic (short Persian), signals (array of: safe|spam|advertising|phone_number|sensitive|negative_emotion|coaching_question). Never invent facts.'],
                ['role' => 'user', 'content' => $body],
            ], ['temperature' => 0.2]);

            $json = $this->extractJson($raw);
            if (! $json) {
                return $this->heuristicCommentAnalysis($body);
            }

            return [
                'risk_score' => (float) ($json['risk_score'] ?? 0),
                'sentiment' => (string) ($json['sentiment'] ?? 'neutral'),
                'topic' => (string) ($json['topic'] ?? ''),
                'signals' => array_values((array) ($json['signals'] ?? ['safe'])),
            ];
        } catch (AiServiceException|\Throwable $e) {
            Log::warning('FamilyIntelligenceService::analyzeComment failed', ['error' => $e->getMessage()]);

            return $this->heuristicCommentAnalysis($body);
        }
    }

    /**
     * @return array{topics: list<array{topic: string, percent: float}>, sample_size: int, trend?: string, suggestion?: string, low_sample: bool}
     */
    public function summarizeDaily(int $sampleSize, array $topicCounts = []): array
    {
        $total = max(1, array_sum($topicCounts));
        $topics = [];
        arsort($topicCounts);
        foreach ($topicCounts as $topic => $count) {
            $topics[] = [
                'topic' => (string) $topic,
                'percent' => round(($count / $total) * 100, 1),
            ];
        }

        $lowSample = $sampleSize < 30;

        $suggestion = null;
        if (! $lowSample && $topics !== []) {
            $top = $topics[0]['topic'];
            $suggestion = "پیشنهاد: امروز یک وویس کوتاه درباره «{$top}» ضبط کن.";
        }

        return [
            'topics' => array_slice($topics, 0, 8),
            'sample_size' => $sampleSize,
            'low_sample' => $lowSample,
            'suggestion' => $suggestion,
            'note' => $lowSample ? 'حجم نمونه کم است؛ بینش‌ها با احتیاط تفسیر شوند.' : null,
        ];
    }

    /**
     * @return list<array{key: string, label: string, family_ids: list<int>}>
     */
    public function suggestAudience(): array
    {
        $suggestions = [];

        $suggestions[] = [
            'key' => 'low_activity',
            'label' => 'خانواده‌های کم‌فعال',
            'family_ids' => Family::query()
                ->where('lifecycle', FamilyLifecycle::Cooling->value)
                ->limit(50)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all(),
        ];

        $suggestions[] = [
            'key' => 'forming',
            'label' => 'خانواده‌های تازه‌تشکیل',
            'family_ids' => Family::query()
                ->where('lifecycle', FamilyLifecycle::Forming->value)
                ->limit(50)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all(),
        ];

        $suggestions[] = [
            'key' => 'high_engagement',
            'label' => 'مشارکت بالا',
            'family_ids' => Family::query()
                ->where('lifecycle', FamilyLifecycle::Active->value)
                ->orderByDesc('member_count')
                ->limit(20)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all(),
        ];

        return $suggestions;
    }

    /** @return array{risk_score: float, sentiment: string, topic: string, signals: list<string>} */
    private function heuristicCommentAnalysis(string $body): array
    {
        $signals = ['safe'];
        $risk = 0.05;

        if (preg_match('/09\d{9}|\+98|@|تماس|واتس|تلگرام/u', $body)) {
            $signals = ['phone_number', 'contact'];
            $risk = 0.85;
        } elseif (preg_match('/خرید|فروش|تبلیغ|تخفیف|لینک/u', $body)) {
            $signals = ['advertising', 'spam'];
            $risk = 0.7;
        } elseif (preg_match('/چطور|چگونه|کمک|نمی‌تونم|نمیتونم|ترس|خسته/u', $body)) {
            $signals = ['coaching_question', 'safe'];
            $risk = 0.1;
        }

        return [
            'risk_score' => $risk,
            'sentiment' => 'neutral',
            'topic' => '',
            'signals' => $signals,
        ];
    }

    /** @return array<string, mixed>|null */
    private function extractJson(string $raw): ?array
    {
        if (preg_match('/\{.*\}/s', $raw, $m)) {
            $decoded = json_decode($m[0], true);

            return is_array($decoded) ? $decoded : null;
        }

        return null;
    }
}
