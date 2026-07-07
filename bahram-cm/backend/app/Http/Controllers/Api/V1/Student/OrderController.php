<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orders = $request->user()->orders()
            ->with('product')
            ->orderByDesc('id')
            ->paginate((int) $request->input('per_page', 20));

        return ApiResponse::success(
            $orders->getCollection()->map(fn ($order) => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'product_title' => $order->product?->title,
                'final_amount' => $order->final_amount,
                'status' => $order->status,
                'payment_status' => $order->payment_status,
                'paid_at' => $order->paid_at?->toIso8601String(),
                'created_at' => $order->created_at?->toIso8601String(),
            ]),
            200,
            [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'total' => $orders->total(),
            ]
        );
    }
}
