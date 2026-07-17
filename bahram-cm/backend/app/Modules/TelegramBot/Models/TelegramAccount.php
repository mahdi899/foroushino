<?php

namespace App\Modules\TelegramBot\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class TelegramAccount extends Model
{
    protected $fillable = [
        'telegram_bot_id',
        'user_id',
        'telegram_user_id',
        'telegram_username',
        'first_name',
        'last_name',
        'display_name',
        'mobile',
        'mobile_verified_at',
        'language_code',
        'is_blocked',
        'is_bot_admin',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'telegram_user_id' => 'integer',
            'mobile_verified_at' => 'datetime',
            'is_blocked' => 'boolean',
            'is_bot_admin' => 'boolean',
            'metadata' => 'array',
        ];
    }

    public function bot(): BelongsTo
    {
        return $this->belongsTo(TelegramBot::class, 'telegram_bot_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function conversation(): HasOne
    {
        return $this->hasOne(TelegramConversation::class);
    }

    public function termsAcceptances(): HasMany
    {
        return $this->hasMany(TelegramTermsAcceptance::class);
    }

    public function loginTokens(): HasMany
    {
        return $this->hasMany(TelegramLoginToken::class);
    }

    public function isLinked(): bool
    {
        return $this->user_id !== null;
    }

    public function hasVerifiedMobile(): bool
    {
        return $this->mobile_verified_at !== null && filled($this->mobile);
    }

    public function isBotAdmin(): bool
    {
        return (bool) $this->is_bot_admin;
    }
}
