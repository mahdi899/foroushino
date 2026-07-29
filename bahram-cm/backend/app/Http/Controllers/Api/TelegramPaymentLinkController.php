<?php

namespace App\Http\Controllers\Api;

use App\Services\TelegramPaymentLinkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TelegramPaymentLinkController
{
    public function __construct(
        private readonly TelegramPaymentLinkService $paymentLinks,
    ) {}

    public function show(Request $request, string $token): JsonResponse
    {
        $result = $this->paymentLinks->resolve($token);

        $http = match ($result['status']) {
            'ok' => 200,
            'already_paid' => 200,
            'unavailable' => 422,
            default => 410,
        };

        return response()->json([
            'ok' => $result['status'] === 'ok',
            'status' => $result['status'],
            'message' => $result['message'],
            'payment_url' => $result['payment_url'],
            'amount' => $result['amount'],
            'order_id' => $result['order_id'],
            'product_title' => $result['product_title'],
            'bot_url' => $result['bot_url'],
        ], $http);
    }
}
