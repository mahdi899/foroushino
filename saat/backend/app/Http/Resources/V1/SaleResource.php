<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Sale
 */
class SaleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'lead_id' => $this->lead_id,
            'lead' => $this->whenLoaded('lead', fn () => [
                'id' => $this->lead->id,
                'full_name' => $this->lead->fullName(),
                'phone' => $this->lead->phone,
            ]),
            'agent_id' => $this->agent_id,
            'agent_name' => $this->whenLoaded('agent', fn () => $this->agent?->name),
            'team_id' => $this->team_id,
            'product_id' => $this->product_id,
            'product' => $this->whenLoaded('product', fn () => [
                'id' => $this->product?->id,
                'name' => $this->product?->name,
            ]),
            'amount' => (string) $this->amount,
            'status' => $this->status?->value,
            'payment_method' => $this->payment_method?->value,
            'payments' => PaymentResource::collection($this->whenLoaded('payments')),
            'commission' => $this->whenLoaded('commission', fn () => $this->commission ? new CommissionResource($this->commission) : null),
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'confirmed_at' => $this->confirmed_at?->toIso8601String(),
            'rejected_at' => $this->rejected_at?->toIso8601String(),
            'rejection_reason' => $this->rejection_reason,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
