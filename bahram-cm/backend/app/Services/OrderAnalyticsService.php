<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Payment;
use App\Support\Mobile;
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
        'card_to_card' => 'کارت به کارت',
    ];

    /** @var list<string> */
    private const PAID_STATUSES = ['paid', 'fulfilled'];

    /** @var list<string> */
    private const CANCELLED_STATUSES = ['cancelled'];

    /**
     * @return array<string, mixed>
     */
    public function report(?int $days = 30): array
    {
        $from = $this->periodStart($days);

        $base = Order::query()->when($from, fn ($q) => $q->where('orders.created_at', '>=', $from));

        $totalOrders = (clone $base)->whereNotIn('status', self::CANCELLED_STATUSES)->count();
        $cancelledOrders = (clone $base)->whereIn('status', self::CANCELLED_STATUSES)->count();
        $allOrders = $totalOrders + $cancelledOrders;
        $pendingOrders = (clone $base)->where('status', 'pending_payment')->count();
        $failedOrders = (clone $base)->where('status', 'failed')->count();
        $paidOrders = (clone $base)->whereIn('status', self::PAID_STATUSES)->count();
        $totalRevenue = (int) (clone $base)->whereIn('status', self::PAID_STATUSES)->sum('final_amount');
        $pendingRevenue = (int) (clone $base)->where('status', 'pending_payment')->sum('final_amount');
        $avgOrderValue = $paidOrders > 0 ? (int) round($totalRevenue / $paidOrders) : 0;
        $conversionRate = $allOrders > 0 ? round(($paidOrders / $allOrders) * 100, 1) : 0.0;
        $paymentFunnel = $this->paymentFunnelMetrics($base, $allOrders);

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

        $daily = $this->dailyTrend($from, $days);

        $byProduct = (clone $base)
            ->join('products', 'orders.product_id', '=', 'products.id')
            ->select('products.id as product_id', 'products.title')
            ->selectRaw("sum(case when orders.status in ({$paidList}) then 1 else 0 end) as count")
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

        $byGateway = $this->gatewayBreakdown($base);

        $byOrderUniqueness = $this->orderUniquenessBreakdown($base);

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
                'product_id' => $p->order?->product_id,
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
                'all_orders' => $allOrders,
                'cancelled_orders' => $cancelledOrders,
                'pending_orders' => $pendingOrders,
                'failed_orders' => $failedOrders,
                'paid_orders' => $paidOrders,
                'total_revenue' => $totalRevenue,
                'pending_revenue' => $pendingRevenue,
                'avg_order_value' => $avgOrderValue,
                'conversion_rate' => $conversionRate,
                'pre_gateway_dropout_count' => $paymentFunnel['pre_gateway_dropout_count'],
                'pre_gateway_dropout_rate' => $paymentFunnel['pre_gateway_dropout_rate'],
                'gateway_started_count' => $paymentFunnel['gateway_started_count'],
                'gateway_abandoned_count' => $paymentFunnel['gateway_abandoned_count'],
                'gateway_pending_order_count' => $paymentFunnel['gateway_pending_order_count'],
                'gateway_abandonment_rate' => $paymentFunnel['gateway_abandonment_rate'],
                'gateway_pending_rate' => $paymentFunnel['gateway_pending_rate'],
            ],
            'fulfillment' => $fulfillment,
            'by_status' => $byStatus,
            'by_payment_status' => $byPaymentStatus,
            'by_gateway' => $byGateway,
            'by_order_uniqueness' => $byOrderUniqueness,
            'daily' => $daily,
            'by_product' => $byProduct,
            'recent_transactions' => $recentTransactions,
        ];
    }

    /**
     * Daily paid-order trend keyed by payment date (paid_at), not order creation date.
     *
     * @return list<array{date: string, paid_orders: int, revenue: int}>
     */
    private function dailyTrend(?\Illuminate\Support\Carbon $from, ?int $days): array
    {
        $paidDateExpr = $this->paidAtDateExpr();
        $paidAtExpr = DB::getDriverName() === 'sqlite'
            ? 'coalesce(orders.paid_at, orders.created_at)'
            : 'COALESCE(orders.paid_at, orders.created_at)';

        $dailyQuery = Order::query()->whereIn('status', self::PAID_STATUSES);

        if ($from !== null && $days !== null) {
            $dailyQuery
                ->whereRaw("{$paidAtExpr} >= ?", [$from])
                ->whereRaw("{$paidAtExpr} <= ?", [now()->endOfDay()]);
        }

        $dailyRows = $dailyQuery
            ->selectRaw("{$paidDateExpr} as date")
            ->selectRaw('count(*) as paid_orders')
            ->selectRaw('coalesce(sum(final_amount), 0) as revenue')
            ->groupByRaw($paidDateExpr)
            ->orderBy('date')
            ->get();

        if ($days !== null && $from !== null) {
            return $this->fillDailySeries($dailyRows, $days);
        }

        return $this->fillDailySeriesAll($dailyRows);
    }

    private function paidAtDateExpr(): string
    {
        return DB::getDriverName() === 'sqlite'
            ? 'date(coalesce(orders.paid_at, orders.created_at))'
            : 'DATE(COALESCE(orders.paid_at, orders.created_at))';
    }

    /**
     * @param  Collection<int, object{date: string, paid_orders: int|string, revenue: int|string}>  $rows
     * @return list<array{date: string, paid_orders: int, revenue: int}>
     */
    private function fillDailySeriesAll(Collection $rows): array
    {
        if ($rows->isEmpty()) {
            return [];
        }

        $indexed = $rows->keyBy('date');
        $end = now()->startOfDay();
        $start = $end->copy()->subDays(364);
        $firstDataDate = \Illuminate\Support\Carbon::parse((string) $rows->min('date'))->startOfDay();
        if ($firstDataDate->gt($start)) {
            $start = $firstDataDate;
        }

        $series = [];
        for ($d = $start->copy(); $d->lte($end); $d->addDay()) {
            $key = $d->toDateString();
            $row = $indexed->get($key);
            $series[] = [
                'date' => $key,
                'paid_orders' => $row ? (int) $row->paid_orders : 0,
                'revenue' => $row ? (int) $row->revenue : 0,
            ];
        }

        return $series;
    }

    /** @return list<array{key: string, label: string, count: int, revenue: int}> */
    private function gatewayBreakdown(\Illuminate\Database\Eloquent\Builder $base): array
    {
        $orders = (clone $base)
            ->whereIn('status', self::PAID_STATUSES)
            ->with(['payments' => fn ($q) => $q->where('status', 'paid')->orderByDesc('paid_at')->orderByDesc('id')])
            ->get(['id', 'final_amount', 'customer_extra_data']);

        /** @var array<string, array{count: int, revenue: int}> $buckets */
        $buckets = [];

        foreach ($orders as $order) {
            $gateway = $this->resolveOrderGateway($order);
            $buckets[$gateway] ??= ['count' => 0, 'revenue' => 0];
            $buckets[$gateway]['count']++;
            $buckets[$gateway]['revenue'] += (int) $order->final_amount;
        }

        return collect($buckets)
            ->map(fn (array $stats, string $gateway) => [
                'key' => $gateway,
                'label' => self::GATEWAY_LABELS[$gateway] ?? $gateway,
                'count' => $stats['count'],
                'revenue' => $stats['revenue'],
            ])
            ->sortByDesc('count')
            ->values()
            ->all();
    }

    private function resolveOrderGateway(Order $order): string
    {
        $paidPayment = $order->payments->first();
        if ($paidPayment !== null) {
            return self::normalizeGateway((string) $paidPayment->gateway);
        }

        if (data_get($order->customer_extra_data, 'card_to_card.status') === 'approved') {
            return 'card_to_card';
        }

        return 'unknown';
    }

    private static function normalizeGateway(string $gateway): string
    {
        return in_array($gateway, ['c2c', 'card_to_card'], true) ? 'card_to_card' : $gateway;
    }

    /** @return list<array{key: string, label: string, count: int, revenue: int}> */
    private function orderUniquenessBreakdown(\Illuminate\Database\Eloquent\Builder $base): array
    {
        // Include cancelled/failed attempts — replaced checkouts are duplicate registrations per buyer+product.
        $orders = (clone $base)
            ->orderBy('created_at')
            ->orderBy('id')
            ->get(['id', 'user_id', 'customer_phone', 'product_id', 'final_amount', 'status']);

        $uniqueCount = 0;
        $duplicateCount = 0;
        $uniqueRevenue = 0;
        $duplicateRevenue = 0;

        foreach ($orders->groupBy(fn (Order $order) => $this->buyerProductKey($order)) as $group) {
            $uniqueCount++;
            $duplicateCount += max(0, $group->count() - 1);

            $paid = $group
                ->filter(fn (Order $order) => in_array($order->status, self::PAID_STATUSES, true))
                ->values();

            if ($paid->isEmpty()) {
                continue;
            }

            $uniqueRevenue += (int) $paid->first()->final_amount;
            foreach ($paid->slice(1) as $duplicatePaid) {
                $duplicateRevenue += (int) $duplicatePaid->final_amount;
            }
        }

        return [
            [
                'key' => 'unique',
                'label' => 'سفارش یونیک',
                'count' => $uniqueCount,
                'revenue' => $uniqueRevenue,
            ],
            [
                'key' => 'duplicate',
                'label' => 'سفارش تکراری',
                'count' => $duplicateCount,
                'revenue' => $duplicateRevenue,
            ],
        ];
    }

    private function buyerProductKey(Order $order): string
    {
        $buyer = $order->user_id
            ? 'u:'.$order->user_id
            : 'p:'.(Mobile::normalize((string) $order->customer_phone) ?: 'o:'.$order->id);

        return $buyer.'|'.$order->product_id;
    }

    /**
     * Order-level payment funnel — all rates use all_orders as denominator so they sum with conversion.
     *
     * @return array{
     *     pre_gateway_dropout_count: int,
     *     pre_gateway_dropout_rate: float,
     *     gateway_started_count: int,
     *     gateway_abandoned_count: int,
     *     gateway_pending_order_count: int,
     *     gateway_abandonment_rate: float,
     *     gateway_pending_rate: float
     * }
     */
    private function paymentFunnelMetrics(\Illuminate\Database\Eloquent\Builder $base, int $allOrders): array
    {
        $notPaid = (clone $base)->whereNotIn('status', self::PAID_STATUSES);

        $preGatewayDropoutCount = (clone $notPaid)
            ->whereDoesntHave('payments')
            ->count();

        $gatewayPendingOrderCount = (clone $notPaid)
            ->whereHas('payments', fn ($q) => $q->where('status', 'pending'))
            ->count();

        $gatewayAbandonedOrderCount = (clone $notPaid)
            ->whereHas('payments')
            ->whereDoesntHave('payments', fn ($q) => $q->where('status', 'paid'))
            ->whereDoesntHave('payments', fn ($q) => $q->where('status', 'pending'))
            ->count();

        $orderIds = (clone $base)->select('orders.id');
        $gatewayStartedCount = Payment::query()->whereIn('order_id', $orderIds)->count();

        $rate = static fn (int $count): float => $allOrders > 0
            ? round(($count / $allOrders) * 100, 1)
            : 0.0;

        return [
            'pre_gateway_dropout_count' => $preGatewayDropoutCount,
            'pre_gateway_dropout_rate' => $rate($preGatewayDropoutCount),
            'gateway_started_count' => $gatewayStartedCount,
            'gateway_abandoned_count' => $gatewayAbandonedOrderCount,
            'gateway_pending_order_count' => $gatewayPendingOrderCount,
            'gateway_abandonment_rate' => $rate($gatewayAbandonedOrderCount),
            'gateway_pending_rate' => $rate($gatewayPendingOrderCount),
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
     * @param  Collection<int, object{date: string, paid_orders: int|string, revenue: int|string}>  $rows
     * @return list<array{date: string, paid_orders: int, revenue: int}>
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
                'paid_orders' => $row ? (int) $row->paid_orders : 0,
                'revenue' => $row ? (int) $row->revenue : 0,
            ];
        }

        return $series;
    }

    private function periodStart(?int $days): ?\Illuminate\Support\Carbon
    {
        if ($days === null || $days <= 0) {
            return null;
        }

        // Exactly N calendar days ending today (inclusive), aligned with fillDailySeries().
        return now()->subDays($days - 1)->startOfDay();
    }
}
