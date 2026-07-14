<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Commission
 */
class CommissionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sale_id' => $this->sale_id,
            'agent_id' => $this->agent_id,
            'product_id' => $this->product_id,
            'product' => $this->whenLoaded('product', fn () => $this->product?->name),
            'lead_id' => $this->lead_id,
            'lead' => $this->whenLoaded('lead', fn () => $this->lead?->fullName()),
            'sale_amount' => (string) $this->sale_amount,
            'commission_rate' => (string) $this->commission_rate,
            'commission_amount' => (string) $this->commission_amount,
            'status' => $this->status?->value,
            'available_at' => $this->available_at?->toIso8601String(),
            'approved_at' => $this->approved_at?->toIso8601String(),
            'leader_approved_at' => $this->leader_approved_at?->toIso8601String(),
            'agent_name' => $this->whenLoaded('agent', fn () => $this->agent?->name),
            'rejection_reason' => $this->rejection_reason,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
