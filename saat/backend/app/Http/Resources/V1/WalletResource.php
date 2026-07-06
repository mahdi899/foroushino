<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Wallet
 */
class WalletResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'balance_available' => (string) $this->balance_available,
            'balance_pending' => (string) $this->balance_pending,
            'balance_locked' => (string) $this->balance_locked,
            'total_earned' => (string) $this->total_earned,
            'total_paid' => (string) $this->total_paid,
        ];
    }
}
