<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\SpotplayerLicense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SpotplayerLicenseAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = SpotplayerLicense::query()
            ->with([
                'user.profile',
                'order:id,order_number,paid_at,customer_phone,customer_name',
                'product:id,title',
            ])
            ->whereNotNull('license_key')
            ->orderByDesc('id');

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('license_key', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($user) use ($search) {
                        $user->where('name', 'like', "%{$search}%")
                            ->orWhere('mobile', 'like', "%{$search}%");
                    })
                    ->orWhereHas('order', fn ($order) => $order->where('order_number', 'like', "%{$search}%"))
                    ->orWhereHas('product', fn ($product) => $product->where('title', 'like', "%{$search}%"));
            });
        }

        $perPage = min(max((int) $request->input('per_page', 50), 1), 100);
        $licenses = $query->paginate($perPage);

        return response()->json([
            'data' => $licenses->getCollection()->map(fn (SpotplayerLicense $license) => $this->payload($license)),
            'meta' => [
                'current_page' => $licenses->currentPage(),
                'last_page' => $licenses->lastPage(),
                'total' => $licenses->total(),
            ],
        ]);
    }

    /** @return array<string, mixed> */
    private function payload(SpotplayerLicense $license): array
    {
        $user = $license->user;
        $profile = $user?->profile;
        $displayName = trim(implode(' ', array_filter([$profile?->first_name, $profile?->last_name])));

        if ($displayName === '') {
            $displayName = (string) ($user?->name ?: $license->order?->customer_name ?: '');
        }

        return [
            'id' => $license->id,
            'user_id' => $license->user_id,
            'user_name' => $displayName !== '' ? $displayName : null,
            'user_mobile' => $user?->mobile ?? $license->order?->customer_phone,
            'order_id' => $license->order_id,
            'order_number' => $license->order?->order_number,
            'product_title' => $license->product?->title,
            'license_key' => $license->license_key,
            'status' => $license->status->value,
            'issued_at' => $license->order?->paid_at?->toIso8601String() ?? $license->created_at?->toIso8601String(),
            'created_at' => $license->created_at?->toIso8601String(),
        ];
    }
}
