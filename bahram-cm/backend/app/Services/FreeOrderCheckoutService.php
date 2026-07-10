<?php

namespace App\Services;

use App\Models\Order;
use App\Services\DiscountService;
use Illuminate\Support\Facades\DB;

class FreeOrderCheckoutService
{
    public function __construct(
        private readonly MiniCourseEnrollmentService $miniCourses,
        private readonly PaymentReceiptTokenService $receiptTokens,
        private readonly DiscountService $discounts,
        private readonly InAppNotificationService $notifications,
    ) {}

    public function isFree(Order $order): bool
    {
        return (int) $order->final_amount <= 0;
    }

    /**
     * @return array{payment_url: string, order_number: string}
     */
    public function complete(Order $order): array
    {
        if (! $this->isFree($order)) {
            throw new \InvalidArgumentException('Order is not free.');
        }

        if ($order->isPaid()) {
            return [
                'payment_url' => $this->resultUrl($order, 'success'),
                'order_number' => $order->order_number,
            ];
        }

        DB::transaction(function () use ($order) {
            $order->update([
                'status' => 'fulfilled',
                'payment_status' => 'paid',
                'paid_at' => now(),
            ]);

            $order->refresh()->loadMissing('product.miniCourse', 'user');

            if ($order->product?->isMiniCourseProduct()) {
                $enrollment = $this->miniCourses->enrollFromPaidOrder($order);
                if ($enrollment?->wasRecentlyCreated && $order->user && $order->product?->miniCourse) {
                    $this->notifications->miniCourseEnrolled($order->user, $order->product->miniCourse, $order);
                }
            }

            $this->discounts->recordUsage($order);
        });

        $order->refresh();

        return [
            'payment_url' => $this->resultUrl($order, 'success'),
            'order_number' => $order->order_number,
        ];
    }

    private function resultUrl(Order $order, string $status): string
    {
        $order->loadMissing('product');
        $token = $this->receiptTokens->issue($order, $status);
        $frontendUrl = rtrim((string) config('app.frontend_url'), '/');

        return "{$frontendUrl}/payment/result?token=".urlencode($token);
    }
}
