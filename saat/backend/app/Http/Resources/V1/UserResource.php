<?php

namespace App\Http\Resources\V1;

use App\Support\PasswordLogin;
use App\Support\PublicMediaUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'avatar' => PublicMediaUrl::normalize($this->avatar),
            'team_id' => $this->team_id,
            'team_name' => $this->whenLoaded('team', fn () => $this->team?->name),
            'level' => $this->level,
            'points' => $this->points,
            'streak' => $this->streak,
            'call_goal' => $this->call_goal,
            'sale_goal' => $this->sale_goal,
            'availability' => $this->availability?->value,
            'is_active' => $this->is_active,
            'password_login_enabled' => PasswordLogin::enabledForUser($this->resource),
            'roles' => $this->getRoleNames(),
            'permissions' => $this->getAllPermissions()->pluck('name'),
        ];
    }
}
