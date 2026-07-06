<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\ChatbotLog;
use App\Models\ChatbotSession;
use App\Models\Lead;
use App\Models\Media;
use App\Models\Order;
use App\Models\Product;
use App\Services\ChatbotService;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    private const LEAD_STATUS_LABELS = [
        'new' => 'جدید',
        'contacted' => 'تماس گرفته شده',
        'converted' => 'تبدیل شده',
        'ignored' => 'رد شده',
    ];

    public function summary(ChatbotService $chatbot): JsonResponse
    {
        $chatbotConfig = $chatbot->mergedConfig();
        $pendingOperator = ChatbotLog::query()
            ->where('metadata->event', 'visitor_message')
            ->where('metadata->pending_operator', true)
            ->count();

        $recentLeads = Lead::query()
            ->orderByDesc('id')
            ->limit(6)
            ->get()
            ->map(fn (Lead $lead) => [
                'id' => $lead->id,
                'name' => $lead->name ?? '—',
                'phone' => $lead->phone ?? '—',
                'status' => $lead->status ?? 'new',
                'status_label' => self::LEAD_STATUS_LABELS[$lead->status] ?? ($lead->status ?? 'جدید'),
                'created_at' => $lead->created_at?->toIso8601String() ?? '',
            ])
            ->values()
            ->all();

        return response()->json([
            'data' => [
                'leads' => Lead::query()->count(),
                'new_leads' => Lead::query()->where('status', 'new')->count(),
                'products' => Product::query()->where('is_active', true)->count(),
                'orders' => Order::query()->count(),
                'pending_orders' => Order::query()->where('status', 'pending_payment')->count(),
                'articles' => Article::query()->count(),
                'published_articles' => Article::query()->published()->count(),
                'media' => Media::query()->count(),
                'chatbot' => [
                    'enabled' => (bool) ($chatbotConfig['enabled'] ?? false),
                    'pending_operator' => $pendingOperator,
                    'sessions' => ChatbotSession::query()->count(),
                ],
                'recent_leads' => $recentLeads,
            ],
        ]);
    }
}
