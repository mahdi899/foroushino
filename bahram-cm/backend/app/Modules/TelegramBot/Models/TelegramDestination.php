<?php

namespace App\Modules\TelegramBot\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TelegramDestination extends Model
{
    protected $fillable = [
        'telegram_bot_id',
        'title',
        'chat_id',
        'chat_type',
        'username',
        'join_request_url',
        'access_mode',
        'is_active',
        'welcome_inside_chat',
        'settings',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'welcome_inside_chat' => 'boolean',
            'settings' => 'array',
        ];
    }

    public function bot(): BelongsTo
    {
        return $this->belongsTo(TelegramBot::class, 'telegram_bot_id');
    }

    public function requirements(): HasMany
    {
        return $this->hasMany(TelegramDestinationRequirement::class);
    }

    public function inviteLinks(): HasMany
    {
        return $this->hasMany(TelegramDestinationInviteLink::class);
    }

    public function usesPerUserInvites(): bool
    {
        return in_array((string) $this->access_mode, ['per_user', 'per_user_join_request'], true)
            || (bool) data_get($this->settings, 'per_user_invite', false);
    }
}
