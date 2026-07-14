<?php

namespace App\Jobs\Family;

use App\Models\FamilyComment;
use App\Services\Family\FamilyIntelligenceService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class AnalyzeFamilyCommentJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(public int $commentId) {}

    public function handle(FamilyIntelligenceService $intelligence): void
    {
        $comment = FamilyComment::query()->find($this->commentId);
        if (! $comment) {
            return;
        }

        try {
            $result = $intelligence->analyzeComment($comment->body);
            $comment->update([
                'ai_risk_score' => $result['risk_score'] ?? null,
                'ai_sentiment' => $result['sentiment'] ?? null,
                'ai_topic' => $result['topic'] ?? null,
                'ai_signals' => $result['signals'] ?? null,
            ]);
        } catch (\Throwable $e) {
            Log::channel('stack')->warning('Family comment AI analysis failed', [
                'comment_id' => $this->commentId,
                'error' => $e->getMessage(),
            ]);
            // Non-critical — do not fail the queue hard after retries.
            if ($this->attempts() >= $this->tries) {
                return;
            }
            throw $e;
        }
    }
}
