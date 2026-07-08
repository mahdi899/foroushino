<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Services\PaymentReceiptTokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentResultSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_forged_query_params_cannot_verify_payment_result(): void
    {
        $order = $this->paidOrder();

        $this->getJson('/api/orders/payment-result?status=success&order='.$order->order_number.'&product=campaign')
            ->assertForbidden();
    }

    public function test_valid_receipt_token_returns_verified_success(): void
    {
        $order = $this->paidOrder();
        $token = app(PaymentReceiptTokenService::class)->issue($order, 'success');

        $this->getJson('/api/orders/payment-result?token='.$token)
            ->assertOk()
            ->assertJsonPath('data.status', 'success')
            ->assertJsonPath('data.order_number', $order->order_number);
    }

    public function test_success_token_rejected_for_unpaid_order(): void
    {
        $order = $this->unpaidOrder();
        $token = app(PaymentReceiptTokenService::class)->issue($order, 'success');

        $this->getJson('/api/orders/payment-result?token='.$token)
            ->assertForbidden();
    }

    public function test_invalid_receipt_token_is_rejected(): void
    {
        $this->getJson('/api/orders/payment-result?token=invalid-token')
            ->assertForbidden();
    }

    private function paidOrder(): Order
    {
        $product = Product::create([
            'title' => 'دوره تست',
            'slug' => 'campaign-writing',
            'type' => 'normal',
            'price' => 500000,
            'is_active' => true,
        ]);

        return Order::create([
            'order_number' => 'BC-260708-W36JO',
            'product_id' => $product->id,
            'customer_name' => 'علی رضایی',
            'customer_phone' => '09351234567',
            'amount' => 500000,
            'discount_amount' => 0,
            'final_amount' => 500000,
            'status' => 'paid',
            'payment_status' => 'paid',
            'paid_at' => now(),
        ]);
    }

    private function unpaidOrder(): Order
    {
        $product = Product::create([
            'title' => 'دوره تست',
            'slug' => 'campaign-writing',
            'type' => 'normal',
            'price' => 500000,
            'is_active' => true,
        ]);

        return Order::create([
            'order_number' => 'BC-260708-PENDING',
            'product_id' => $product->id,
            'customer_name' => 'علی رضایی',
            'customer_phone' => '09351234567',
            'amount' => 500000,
            'discount_amount' => 0,
            'final_amount' => 500000,
            'status' => 'pending_payment',
            'payment_status' => 'pending',
        ]);
    }
}
