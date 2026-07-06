<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Services\OrderService;
use App\Support\ApiResponse;

class OrderController extends Controller
{
    public function __construct(private readonly OrderService $orders) {}

    public function store(StoreOrderRequest $request)
    {
        $order = $this->orders->create($request->validated());

        return ApiResponse::success([
            'id' => $order->id,
            'order_number' => $order->order_number,
            'amount' => $order->amount,
            'discount_amount' => $order->discount_amount,
            'final_amount' => $order->final_amount,
            'status' => $order->status,
            'payment_status' => $order->payment_status,
        ], 201);
    }
}
