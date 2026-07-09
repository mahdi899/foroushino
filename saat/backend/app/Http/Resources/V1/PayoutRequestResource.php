<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\PayoutRequest
 */
class PayoutRequestResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'user_name' => $this->whenLoaded('user', fn () => $this->user?->name),
            'amount' => (string) $this->amount,
            'bank_fee' => (string) $this->bank_fee,
            'net_amount' => (string) ($this->net_amount ?? max(0, (float) $this->amount - (float) $this->bank_fee)),
            'status' => $this->status?->value,
            'requested_at' => $this->requested_at?->toIso8601String(),
            'processed_at' => $this->processed_at?->toIso8601String(),
            'rejection_reason' => $this->rejection_reason,
        ];
    }
}
