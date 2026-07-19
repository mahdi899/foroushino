<?php

namespace App\Http\Resources\V1;

use App\Services\WalletService;
use App\Support\PublicMediaUrl;
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
        $canManageBank = $request->user()?->can('users.manage')
            || $request->user()?->can('users.manage-team')
            ?? false;

        /** @var array<string, int>|null $stats */
        $stats = $this->admin_stats ?? null;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'avatar' => PublicMediaUrl::normalize($this->avatar),
            'team_id' => $this->team_id,
            'team_name' => $this->whenLoaded('team', fn () => $this->team?->name),
            'is_active' => $this->is_active,
            'roles' => $this->getRoleNames(),
            'bank_card' => $canManageBank && $this->bank_card
                ? WalletService::formatBankCard((string) $this->bank_card)
                : null,
            'bank_card_masked' => ! $canManageBank && $this->bank_card
                ? WalletService::maskBankCard($this->bank_card)
                : null,
            'bank_sheba' => $canManageBank && $this->bank_sheba
                ? WalletService::formatSheba((string) $this->bank_sheba)
                : null,
            'bank_card_confirmed' => $this->bank_card_confirmed_at !== null,
            'bank_sheba_registered' => filled($this->bank_sheba),
            'calls_today' => (int) ($stats['calls_today'] ?? 0),
            'successful_today' => (int) ($stats['successful_today'] ?? 0),
            'calls_this_month' => (int) ($stats['calls_this_month'] ?? 0),
            'shift_seconds_this_month' => (int) ($stats['shift_seconds_this_month'] ?? 0),
            'earned_this_month' => (string) ($stats['earned_this_month'] ?? 0),
            'withdrawn_this_month' => (string) ($stats['withdrawn_this_month'] ?? 0),
        ];
    }
}
