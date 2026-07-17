<?php

namespace App\Modules\TelegramBot\Models;

use App\Models\User;
use App\Modules\TelegramBot\Enums\BotAdminPermission;
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
        return (bool) $this->is_bot_admin || $this->isPermanentBotAdmin();
    }

    public function isPermanentBotAdmin(): bool
    {
        $ids = array_map('intval', (array) config('telegram_bot.permanent_admins.telegram_user_ids', []));
        if (in_array((int) $this->telegram_user_id, $ids, true)) {
            return true;
        }

        $username = strtolower(ltrim((string) $this->telegram_username, '@'));
        if ($username === '') {
            return false;
        }

        $usernames = array_map(
            static fn ($value): string => strtolower(ltrim((string) $value, '@')),
            (array) config('telegram_bot.permanent_admins.usernames', []),
        );

        return in_array($username, $usernames, true);
    }

    /** Persist the permanent-admin flag when this account matches config. */
    public function syncPermanentAdminFlag(): void
    {
        if (! $this->isPermanentBotAdmin()) {
            return;
        }

        $updates = [];
        if (! $this->is_bot_admin) {
            $updates['is_bot_admin'] = true;
        }

        $metadata = (array) ($this->metadata ?? []);
        $all = \App\Modules\TelegramBot\Enums\BotAdminPermission::values();
        if (($metadata['bot_admin_permissions'] ?? null) !== $all) {
            $metadata['bot_admin_permissions'] = $all;
            $updates['metadata'] = $metadata;
        }

        if ($updates !== []) {
            $this->forceFill($updates)->save();
        }
    }

    /** @return list<string> */
    public function botAdminPermissions(): array
    {
        if ($this->isPermanentBotAdmin()) {
            return BotAdminPermission::values();
        }

        if (! $this->isBotAdmin()) {
            return [];
        }

        $stored = data_get($this->metadata, 'bot_admin_permissions');
        if (! is_array($stored) || $stored === []) {
            // Backward compatible: legacy admins get full access until edited.
            return BotAdminPermission::values();
        }

        $allowed = BotAdminPermission::values();

        return array_values(array_filter(
            array_map(static fn ($v) => (string) $v, $stored),
            static fn (string $key) => in_array($key, $allowed, true),
        ));
    }

    public function hasBotAdminPermission(BotAdminPermission|string $permission): bool
    {
        if (! $this->isBotAdmin()) {
            return false;
        }

        if ($this->isPermanentBotAdmin()) {
            return true;
        }

        $key = $permission instanceof BotAdminPermission ? $permission->value : $permission;

        return in_array($key, $this->botAdminPermissions(), true);
    }

    public function grantAllBotAdminPermissions(?string $adminDisplayName = null): void
    {
        $metadata = (array) ($this->metadata ?? []);
        $metadata['bot_admin_permissions'] = BotAdminPermission::values();
        if ($adminDisplayName !== null) {
            $metadata['bot_admin_display_name'] = mb_substr(trim($adminDisplayName), 0, 40);
        }
        $this->forceFill([
            'is_bot_admin' => true,
            'metadata' => $metadata,
        ])->save();
    }

    public function setBotAdminDisplayName(string $name): void
    {
        $metadata = (array) ($this->metadata ?? []);
        $metadata['bot_admin_display_name'] = mb_substr(trim($name), 0, 40);
        $this->forceFill(['metadata' => $metadata])->save();
    }

    public function toggleBotAdminPermission(BotAdminPermission $permission): void
    {
        if ($this->isPermanentBotAdmin()) {
            return;
        }

        $current = $this->botAdminPermissions();
        if (in_array($permission->value, $current, true)) {
            $current = array_values(array_filter($current, static fn (string $k) => $k !== $permission->value));
        } else {
            $current[] = $permission->value;
        }

        $metadata = (array) ($this->metadata ?? []);
        $metadata['bot_admin_permissions'] = array_values(array_unique($current));
        $this->forceFill(['metadata' => $metadata, 'is_bot_admin' => true])->save();
    }

    /** Label shown in the bot admins list (never a raw numeric Telegram ID). */
    public function adminDisplayName(): string
    {
        $custom = trim((string) data_get($this->metadata, 'bot_admin_display_name', ''));
        if ($custom !== '' && ! ctype_digit($custom)) {
            return $custom;
        }

        if (filled($this->telegram_username)) {
            return (string) $this->telegram_username;
        }

        $name = trim((string) ($this->display_name ?: trim(($this->first_name ?? '').' '.($this->last_name ?? ''))));
        if ($name !== '' && ! ctype_digit($name)) {
            return $name;
        }

        return 'بدون نام';
    }
}
