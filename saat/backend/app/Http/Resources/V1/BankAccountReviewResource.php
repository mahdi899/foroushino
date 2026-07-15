<?php

namespace App\Http\Resources\V1;

use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\User
 */
class BankAccountReviewResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'user_id' => $this->id,
            'name' => $this->name,
            'team_id' => $this->team_id,
            'team_name' => $this->whenLoaded('team', fn () => $this->team?->name),
            'bank_card' => WalletService::formatBankCard((string) $this->bank_card),
            'bank_sheba' => WalletService::formatSheba((string) $this->bank_sheba),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
