<?php

namespace App\Http\Controllers\Api\V1\Ai;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Services\Ai\LeadScoringService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiAssistController extends Controller
{
    public function scoreLead(Request $request, Lead $lead, LeadScoringService $scoring): JsonResponse
    {
        $this->authorize('view', $lead);

        $result = $scoring->score($lead);

        return ApiResponse::success([
            'lead_id' => $lead->id,
            'score' => $result['score'],
            'factors' => $result['factors'],
            'model_version' => 'heuristic-v1',
            'disclaimer' => 'پیشنهاد سیستمی — تصمیم نهایی با کارشناس/مدیر است.',
        ]);
    }

    public function callSummary(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'note' => ['required', 'string', 'max:5000'],
            'result' => ['nullable', 'string', 'max:40'],
        ]);

        $note = $validated['note'];
        $summary = mb_strlen($note) > 120 ? mb_substr($note, 0, 117).'…' : $note;

        return ApiResponse::success([
            'summary' => $summary,
            'suggested_actions' => ['پیگیری', 'ارسال پیامک', 'ثبت اعتراض'],
            'disclaimer' => 'خلاصه خودکار — نیاز به بازبینی انسانی دارد.',
        ]);
    }
}
