<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class OrderAnalyticsService
{
    private const STATUS_LABELS = [
        'pending_payment' => 'در انتظار پرداخت',
        'paid' => 'پرداخت‌شده',
        'fulfilled' => 'تحویل داده‌شده',
        'failed' => 'ناموفق',
        'cancelled' => 'لغوشده',
    ];

    private const PAYMENT_LABELS = [
        'pending' => 'در انتظار',
        'paid' => 'پرداخت‌شده',
        'failed' => 'ناموفق',
    ];

    private const GATEWAY_LABELS = [
        'zarinpal' => 'زرین‌پال',
    ];

    /** @var list<string> */
    private const PAID_STATUSES = ['paid', 'fulfilled'];

    /**
     * @return array<string, mixed>
     */
    public function report(?int $days = 30): array
    {
        $from = $days !== null && $days > 0 ? now()->subDays($days)->startOfDay() : null;

        $base = Order::query()->when($from, fn ($q) => $q->where('created_at', '>=', $from));

        $totalOrders = (clone $base)->count();
        $paidOrders = (clone $base)->whereIn('status', self::PAID_STATUSES)->count();
        $totalRevenue = (int) (clone $base)->whereIn('status', self::PAID_STATUSES)->sum('final_amount');
        $pendingRevenue = (int) (clone $base)->where('status', 'pending_payment')->sum('final_amount');
        $avgOrderValue = $paidOrders > 0 ? (int) round($totalRevenue / $paidOrders) : 0;
        $conversionRate = $totalOrders > 0 ? round(($paidOrders / $totalOrders) * 100, 1) : 0.0;

        $byStatus = (clone $base)
            ->select('status')
            ->selectRaw('count(*) as count')
            ->selectRaw('coalesce(sum(final_amount), 0) as amount')
            ->groupBy('status')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($row) => [
                'key' => $row->status,
                'label' => self::STATUS_LABELS[$row->status] ?? $row->status,
                'count' => (int) $row->count,
                'amount' => (int) $row->amount,
            ])
            ->values()
            ->all();

        $byPaymentStatus = (clone $base)
            ->select('payment_status')
            ->selectRaw('count(*) as count')
            ->groupBy('payment_status')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($row) => [
                'key' => $row->payment_status,
                'label' => self::PAYMENT_LABELS[$row->payment_status] ?? $row->payment_status,
                'count' => (int) $row->count,
            ])
            ->values()
            ->all();

        $paidList = implode(',', array_map(fn ($s) => "'{$s}'", self::PAID_STATUSES));
        $dateExpr = DB::getDriverName() === 'sqlite' ? 'date(orders.created_at)' : 'DATE(orders.created_at)';

        $dailyRows = (clone $base)
            ->selectRaw("{$dateExpr} as date")
            ->selectRaw('count(*) as orders')
            ->selectRaw("sum(case when status in ({$paidList}) then final_amount else 0 end) as revenue")
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $daily = $from && $days
            ? $this->fillDailySeries($dailyRows, $days)
            : $dailyRows->map(fn ($row) => [
                'date' => (string) $row->date,
                'orders' => (int) $row->orders,
                'revenue' => (int) $row->revenue,
            ])->values()->all();

        $byProduct = (clone $base)
            ->join('products', 'orders.product_id', '=', 'products.id')
            ->select('products.id as product_id', 'products.title')
            ->selectRaw('count(*) as count')
            ->selectRaw("sum(case when orders.status in ({$paidList}) then orders.final_amount else 0 end) as revenue")
            ->groupBy('products.id', 'products.title')
            ->orderByDesc('count')
            ->limit(8)
            ->get()
            ->map(fn ($row) => [
                'product_id' => (int) $row->product_id,
                'title' => $row->title,
                'count' => (int) $row->count,
                'revenue' => (int) $row->revenue,
            ])
            ->values()
            ->all();

        $paymentsQuery = Payment::query()
            ->join('orders', 'payments.order_id', '=', 'orders.id')
            ->when($from, fn ($q) => $q->where('orders.created_at', '>=', $from));

        $byGateway = (clone $paymentsQuery)
            ->where('payments.status', 'paid')
            ->select('payments.gateway')
            ->selectRaw('count(*) as count')
            ->selectRaw('coalesce(sum(payments.amount), 0) as revenue')
            ->groupBy('payments.gateway')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($row) => [
                'key' => $row->gateway,
                'label' => self::GATEWAY_LABELS[$row->gateway] ?? $row->gateway,
                'count' => (int) $row->count,
                'revenue' => (int) $row->revenue,
            ])
            ->values()
            ->all();

        $byGatewayMode = (clone $paymentsQuery)
            ->where('payments.status', 'paid')
            ->get(['payments.authority', 'payments.verify_payload', 'payments.request_payload', 'payments.amount'])
            ->groupBy(fn (Payment $p) => $this->paymentMode($p))
            ->map(fn ($group, $mode) => [
                'key' => $mode,
                'label' => $mode === 'sandbox' ? 'زرین‌پال (تست)' : 'زرین‌پال (واقعی)',
                'count' => $group->count(),
                'revenue' => (int) $group->sum('amount'),
            ])
            ->values()
            ->all();

        $fulfillment = [
            'licenses_issued' => (clone $base)->whereNotNull('spotplayer_license_code')->where('spotplayer_license_code', '!=', '')->count(),
            'sms_sent' => (clone $base)->whereNotNull('sms_sent_at')->count(),
            'course_access_granted' => (clone $base)->whereHas('courseAccess')->count(),
            'referral_orders' => (clone $base)->whereNotNull('referral_code')->where('referral_code', '!=', '')->count(),
        ];

        $recentTransactions = Payment::query()
            ->with(['order:id,order_number,customer_name,product_id', 'order.product:id,title'])
            ->where('status', 'paid')
            ->whereHas('order', fn ($q) => $from ? $q->where('created_at', '>=', $from) : $q)
            ->orderByDesc('paid_at')
            ->orderByDesc('id')
            ->limit(20)
            ->get()
            ->map(fn (Payment $p) => [
                'id' => $p->id,
                'order_id' => $p->order_id,
                'order_number' => $p->order?->order_number,
                'customer_name' => $p->order?->customer_name,
                'product_title' => $p->order?->product?->title,
                'gateway' => $p->gateway,
                'gateway_label' => self::GATEWAY_LABELS[$p->gateway] ?? $p->gateway,
                'mode' => $this->paymentMode($p),
                'mode_label' => $this->paymentMode($p) === 'sandbox' ? 'تست' : 'واقعی',
                'authority' => $p->authority,
                'ref_id' => $p->ref_id,
                'card_pan' => data_get($p->verify_payload, 'data.card_pan'),
                'amount' => $p->amount,
                'paid_at' => $p->paid_at?->toIso8601String(),
            ])
            ->values()
            ->all();

        return [
            'period_days' => $days,
            'summary' => [
                'total_orders' => $totalOrders,
                'paid_orders' => $paidOrders,
                'total_revenue' => $totalRevenue,
                'pending_revenue' => $pendingRevenue,
                'avg_order_value' => $avgOrderValue,
                'conversion_rate' => $conversionRate,
            ],
            'fulfillment' => $fulfillment,
            'by_status' => $byStatus,
            'by_payment_status' => $byPaymentStatus,
            'by_gateway' => $byGateway,
            'by_gateway_mode' => $byGatewayMode,
            'daily' => $daily,
            'by_product' => $byProduct,
            'recent_transactions' => $recentTransactions,
        ];
    }

    private function paymentMode(Payment $payment): string
    {
        if (str_starts_with((string) $payment->authority, 'DEV-')) {
            return 'sandbox';
        }

        if (data_get($payment->verify_payload, 'dev_mode') || data_get($payment->request_payload, 'dev_mode')) {
            return 'sandbox';
        }

        return 'live';
    }

    /**
     * @param  Collection<int, object{date: string, orders: int|string, revenue: int|string}>  $rows
     * @return list<array{date: string, orders: int, revenue: int}>
     */
    private function fillDailySeries(Collection $rows, int $days): array
    {
        $indexed = $rows->keyBy('date');
        $series = [];
        $start = now()->subDays($days - 1)->startOfDay();

        for ($i = 0; $i < $days; $i++) {
            $date = $start->copy()->addDays($i)->toDateString();
            $row = $indexed->get($date);
            $series[] = [
                'date' => $date,
                'orders' => $row ? (int) $row->orders : 0,
                'revenue' => $row ? (int) $row->revenue : 0,
            ];
        }

        return $series;
    }
}
