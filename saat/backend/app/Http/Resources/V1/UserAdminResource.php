<?php

namespace App\Http\Resources\V1;

use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\User
 */
class UserAdminResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'team_id' => $this->team_id,
            'team_name' => $this->whenLoaded('team', fn () => $this->team?->name),
            'is_active' => $this->is_active,
            'roles' => $this->getRoleNames(),
            'bank_card_masked' => $this->bank_card
                ? WalletService::maskBankCard($this->bank_card)
                : null,
            'bank_card_confirmed' => $this->bank_card_confirmed_at !== null,
        ];
    }
}
