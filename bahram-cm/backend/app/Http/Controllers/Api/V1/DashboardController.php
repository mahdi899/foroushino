<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\CashbackPayoutStatus;
use App\Enums\CourseAccessStatus;
use App\Enums\ReferralConversionStatus;
use App\Enums\SatApplicationStatus;
use App\Enums\TicketStatus;
use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\CashbackPayout;
use App\Models\ChatbotLog;
use App\Models\ChatbotSession;
use App\Models\CourseAccess;
use App\Models\Lead;
use App\Models\Media;
use App\Models\Notification;
use App\Models\Order;
use App\Models\Product;
use App\Models\ReferralConversion;
use App\Models\SatApplication;
use App\Models\Seminar;
use App\Models\Ticket;
use App\Models\User;
use App\Services\ChatbotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    private const SUMMARY_CACHE_KEY = 'admin.dashboard.summary';

    private const SUMMARY_CACHE_TTL_SECONDS = 30;
    private const LEAD_STATUS_LABELS = [
        'new' => 'جدید',
        'contacted' => 'تماس گرفته شده',
        'converted' => 'تبدیل شده',
        'ignored' => 'رد شده',
    ];

    private const TICKET_STATUS_LABELS = [
        'open' => 'باز',
        'answered' => 'پاسخ داده شده',
        'waiting_user' => 'در انتظار پاسخ کاربر',
        'closed' => 'بسته شده',
    ];

    public function summary(ChatbotService $chatbot): JsonResponse
    {
        $data = Cache::remember(
            self::SUMMARY_CACHE_KEY,
            self::SUMMARY_CACHE_TTL_SECONDS,
            fn () => $this->buildSummary($chatbot),
        );

        return response()->json(['data' => $data]);
    }

    /**
     * @return array<string, mixed>
     */
    private function buildSummary(ChatbotService $chatbot): array
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

        $recentTickets = Ticket::query()
            ->with('user:id,name,mobile')
            ->where('status', TicketStatus::Open)
            ->orderByDesc('id')
            ->limit(5)
            ->get()
            ->map(fn (Ticket $ticket) => [
                'id' => $ticket->id,
                'subject' => $ticket->subject ?? '—',
                'student_name' => $ticket->user?->name ?? '—',
                'status' => $ticket->status?->value ?? 'open',
                'status_label' => self::TICKET_STATUS_LABELS[$ticket->status?->value ?? 'open'] ?? 'باز',
                'created_at' => $ticket->created_at?->toIso8601String() ?? '',
            ])
            ->values()
            ->all();

        $pendingSatStatuses = [
            SatApplicationStatus::Received->value,
            SatApplicationStatus::Reviewing->value,
        ];

        return [
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
                'academy' => [
                    'students' => User::query()->where('is_admin', false)->count(),
                    'active_students' => User::query()->where('is_admin', false)->where('status', 'active')->count(),
                    'tickets_open' => Ticket::query()->where('status', TicketStatus::Open)->count(),
                    'tickets_total' => Ticket::query()->count(),
                    'course_accesses_active' => CourseAccess::query()->where('status', CourseAccessStatus::Active)->count(),
                    'seminars' => Seminar::query()->count(),
                    'upcoming_seminars' => Seminar::query()->where('date', '>=', now())->count(),
                    'sat_applications_pending' => SatApplication::query()->whereIn('status', $pendingSatStatuses)->count(),
                    'cashback_payouts_pending' => CashbackPayout::query()->where('status', CashbackPayoutStatus::Pending)->count(),
                    'referral_conversions_pending' => ReferralConversion::query()
                        ->where('status', ReferralConversionStatus::Pending)
                        ->count(),
                    'referral_conversions' => ReferralConversion::query()->count(),
                    'notifications_sent' => Notification::query()->count(),
                ],
                'recent_leads' => $recentLeads,
                'recent_tickets' => $recentTickets,
            ];
    }
}
