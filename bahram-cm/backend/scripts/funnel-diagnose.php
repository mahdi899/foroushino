<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Order;
use App\Models\Payment;
use App\Modules\TelegramBot\Models\TelegramPaymentLink;

$base = Order::query();

echo "=== Order funnel (all time) ===\n";
echo 'total: ' . $base->count() . "\n";
echo 'paid+fulfilled: ' . (clone $base)->whereIn('status', ['paid', 'fulfilled'])->count() . "\n";
echo 'pending_payment: ' . (clone $base)->where('status', 'pending_payment')->count() . "\n";
echo 'cancelled: ' . (clone $base)->where('status', 'cancelled')->count() . "\n";
echo 'failed: ' . (clone $base)->where('status', 'failed')->count() . "\n";

$paid = (clone $base)->whereIn('status', ['paid', 'fulfilled'])->count();
$all = $base->count();
echo 'conversion (paid/all): ' . ($all > 0 ? round(100 * $paid / $all, 1) : 0) . "%\n\n";

echo "=== Cancelled breakdown ===\n";
$cancelled = (clone $base)->where('status', 'cancelled');
echo 'cancelled without payment record: ' . (clone $cancelled)->whereDoesntHave('payments')->count() . "\n";
echo 'cancelled with pending payment: ' . (clone $cancelled)->whereHas('payments', fn ($q) => $q->where('status', 'pending'))->count() . "\n";
echo 'cancelled with failed payment: ' . (clone $cancelled)->whereHas('payments', fn ($q) => $q->where('status', 'failed'))->count() . "\n";

echo "\n=== C2C cancel reasons (cancelled orders) ===\n";
$reasons = [];
foreach ((clone $cancelled)->whereNotNull('customer_extra_data')->cursor() as $order) {
    $reason = data_get($order->customer_extra_data, 'card_to_card.cancel_reason')
        ?? data_get($order->customer_extra_data, 'cancel_reason')
        ?? 'none';
    $status = data_get($order->customer_extra_data, 'card_to_card.status', 'n/a');
    $key = $status . ' | ' . $reason;
    $reasons[$key] = ($reasons[$key] ?? 0) + 1;
}
arsort($reasons);
foreach (array_slice($reasons, 0, 15, true) as $k => $v) {
    echo "  {$k}: {$v}\n";
}

echo "\n=== Payment records ===\n";
echo 'payments total: ' . Payment::query()->count() . "\n";
echo 'payments pending: ' . Payment::query()->where('status', 'pending')->count() . "\n";
echo 'payments paid: ' . Payment::query()->where('status', 'paid')->count() . "\n";
echo 'payments failed: ' . Payment::query()->where('status', 'failed')->count() . "\n";

echo "\n=== Orders never reached gateway (no payment, still pending then cancelled?) ===\n";
echo 'cancelled, no payments: ' . (clone $cancelled)->whereDoesntHave('payments')->count() . "\n";

echo "\n=== Gateway mix (paid orders) ===\n";
$paidOrders = (clone $base)->whereIn('status', ['paid', 'fulfilled'])->with('payments')->get();
$gw = ['zarinpal' => 0, 'card_to_card' => 0, 'other' => 0];
foreach ($paidOrders as $o) {
    $p = $o->payments->sortByDesc('id')->first();
    if ($p && $p->status === 'paid') {
        $gw[$p->gateway] = ($gw[$p->gateway] ?? 0) + 1;
    } elseif (data_get($o->customer_extra_data, 'card_to_card.status') === 'approved') {
        $gw['card_to_card'] = ($gw['card_to_card'] ?? 0) + 1;
    } else {
        $gw['other']++;
    }
}
$cancelledQ = Order::query()->where('status', 'cancelled');
$paidQ = Order::query()->whereIn('status', ['paid', 'fulfilled']);

$cancelledIds = (clone $cancelledQ)->pluck('id');
$withLink = TelegramPaymentLink::query()->whereIn('order_id', $cancelledIds)->distinct('order_id')->count('order_id');
$linkNeverConsumed = TelegramPaymentLink::query()
    ->whereIn('order_id', $cancelledIds)
    ->whereNull('consumed_at')
    ->distinct('order_id')
    ->count('order_id');
$linkConsumed = TelegramPaymentLink::query()
    ->whereIn('order_id', $cancelledIds)
    ->whereNotNull('consumed_at')
    ->distinct('order_id')
    ->count('order_id');
$noLink = (clone $cancelledQ)->whereNotIn('id', TelegramPaymentLink::query()->select('order_id'))->count();
echo "cancelled with telegram link: {$withLink}\n";
echo "  link never opened: {$linkNeverConsumed}\n";
echo "  link opened but not paid: {$linkConsumed}\n";
echo "cancelled without telegram link: {$noLink}\n";

$paidIds = (clone $paidQ)->pluck('id');
echo "\n=== Paid orders source ===\n";
echo 'paid with telegram link: ' . TelegramPaymentLink::query()->whereIn('order_id', $paidIds)->distinct('order_id')->count('order_id') . "\n";
echo 'paid with zarinpal payment row: ' . (clone $paidQ)->whereHas('payments', fn ($q) => $q->where('status', 'paid'))->count() . "\n";

$from = now()->subDays(30);
$recent = Order::query()->where('created_at', '>=', $from);
$paidR = (clone $recent)->whereIn('status', ['paid', 'fulfilled'])->count();
$allR = $recent->count();
$cancelR = (clone $recent)->where('status', 'cancelled')->count();
$pendR = (clone $recent)->where('status', 'pending_payment')->count();
echo "total: {$allR}, paid: {$paidR}, cancelled: {$cancelR}, pending: {$pendR}\n";
echo 'conversion: ' . ($allR > 0 ? round(100 * $paidR / $allR, 1) : 0) . "%\n";
echo 'cancelled no payment: ' . (clone $recent)->where('status', 'cancelled')->whereDoesntHave('payments')->count() . "\n";
echo 'cancelled with payment: ' . (clone $recent)->where('status', 'cancelled')->whereHas('payments')->count() . "\n";
echo 'orders with payment started: ' . (clone $recent)->whereHas('payments')->count() . "\n";
$started = (clone $recent)->whereHas('payments')->count();
$paidAfterStart = (clone $recent)->whereHas('payments', fn ($q) => $q->where('status', 'paid'))->count();
echo 'gateway conversion (paid / started): ' . ($started > 0 ? round(100 * $paidAfterStart / $started, 1) : 0) . "%\n";

echo "\n=== Last 7 days ===\n";
$from7 = now()->subDays(7);
$r7 = Order::query()->where('created_at', '>=', $from7);
$p7 = (clone $r7)->whereIn('status', ['paid', 'fulfilled'])->count();
$a7 = $r7->count();
echo "total: {$a7}, paid: {$p7}, conv: " . ($a7 > 0 ? round(100 * $p7 / $a7, 1) : 0) . "%\n";
echo 'cancelled: ' . (clone $r7)->where('status', 'cancelled')->count() . "\n";
echo 'cancelled no pay: ' . (clone $r7)->where('status', 'cancelled')->whereDoesntHave('payments')->count() . "\n";
