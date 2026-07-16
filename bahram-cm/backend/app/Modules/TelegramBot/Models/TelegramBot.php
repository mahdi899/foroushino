<?php

namespace App\Modules\TelegramBot\Models;

use App\Modules\TelegramBot\Enums\TelegramBotEnvironment;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TelegramBot extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'display_name',
        'username',
        'token_key',
        'webhook_secret',
        'environment',
        'is_active',
        'support_group_chat_id',
        'reports_chat_id',
        'reports_topic_id',
        'settings',
    ];

    protected $hidden = [
        'webhook_secret',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'environment' => TelegramBotEnvironment::class,
            'settings' => 'array',
        ];
    }

    public function updates(): HasMany
    {
        return $this->hasMany(TelegramUpdate::class);
    }

    public function accounts(): HasMany
    {
        return $this->hasMany(TelegramAccount::class);
    }

    public function requiredChats(): HasMany
    {
        return $this->hasMany(TelegramRequiredChat::class);
    }

    /**
     * Resolve the actual bot token from the environment. The token itself is
     * never persisted in the database — only the name of the env var is
     * (`token_key`) — and it is read directly from the process environment
     * so it works whether or not config is cached.
     */
    public function resolveToken(): ?string
    {
        if (blank($this->token_key)) {
            return null;
        }

        $value = env($this->token_key);

        return filled($value) ? (string) $value : null;
    }

    public function isProduction(): bool
    {
        return $this->environment === TelegramBotEnvironment::Production;
    }
}
