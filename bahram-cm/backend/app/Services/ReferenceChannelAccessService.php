<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use App\Models\ReferenceChannel;
use App\Models\ReferenceChannelEntitlement;
use App\Models\User;
use App\Support\Mobile;

class ReferenceChannelAccessService
{
    public function syncFromPaidOrders(User $user): void
    {
        $productIds = ReferenceChannel::query()
            ->whereNotNull('product_id')
            ->pluck('id', 'product_id');

        if ($productIds->isEmpty()) {
            return;
        }

        $phone = Mobile::normalize((string) $user->mobile);

        $orders = Order::query()
            ->whereIn('product_id', $productIds->keys())
            ->whereIn('status', ['paid', 'fulfilled'])
            ->where(function ($query) use ($user, $phone) {
                $query->where('user_id', $user->id);
                if ($phone) {
                    $query->orWhere('customer_phone', $phone);
                }
            })
            ->get(['id', 'product_id']);

        foreach ($orders as $order) {
            $channelId = $productIds->get($order->product_id);
            if (! $channelId) {
                continue;
            }

            ReferenceChannelEntitlement::query()->firstOrCreate(
                [
                    'reference_channel_id' => $channelId,
                    'user_id' => $user->id,
                ],
                [
                    'order_id' => $order->id,
                    'source' => 'purchase',
                ]
            );
        }
    }

    public function grant(ReferenceChannel $channel, User $user, ?Order $order = null, string $source = 'admin'): ReferenceChannelEntitlement
    {
        return ReferenceChannelEntitlement::query()->firstOrCreate(
            [
                'reference_channel_id' => $channel->id,
                'user_id' => $user->id,
            ],
            [
                'order_id' => $order?->id,
                'source' => $source,
            ]
        );
    }

    public function userHasEntitlement(User $user, ReferenceChannel $channel): bool
    {
        return ReferenceChannelEntitlement::query()
            ->where('reference_channel_id', $channel->id)
            ->where('user_id', $user->id)
            ->exists();
    }

    public function userHasAnyEntitlement(User $user): bool
    {
        return ReferenceChannelEntitlement::query()
            ->where('user_id', $user->id)
            ->exists();
    }

    public function findByProduct(Product $product): ?ReferenceChannel
    {
        if ($product->relationLoaded('referenceChannel')) {
            return $product->referenceChannel;
        }

        return ReferenceChannel::query()->where('product_id', $product->id)->first();
    }
}
