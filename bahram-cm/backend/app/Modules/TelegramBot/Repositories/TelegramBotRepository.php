<?php

namespace App\Modules\TelegramBot\Repositories;

use App\Modules\TelegramBot\Models\TelegramBot;
use Illuminate\Support\Collection;

class TelegramBotRepository
{
    public function findByKey(string $key): ?TelegramBot
    {
        return TelegramBot::query()->where('key', $key)->first();
    }

    public function findActiveByKey(string $key): ?TelegramBot
    {
        return TelegramBot::query()->where('key', $key)->where('is_active', true)->first();
    }

    /** @return Collection<int, TelegramBot> */
    public function allActive(): Collection
    {
        return TelegramBot::query()->where('is_active', true)->get();
    }

    /** @return Collection<int, TelegramBot> */
    public function all(): Collection
    {
        return TelegramBot::query()->orderBy('key')->get();
    }

    /**
     * Create (or update) a bot row from a `config('telegram.bots.*)` entry.
     *
     * @param  array<string, mixed>  $configEntry
     */
    public function upsertFromConfig(string $key, array $configEntry): TelegramBot
    {
        return TelegramBot::query()->updateOrCreate(
            ['key' => $key],
            [
                'display_name' => (string) ($configEntry['display_name'] ?? $key),
                'username' => $this->resolveEnvValue($configEntry['username_env'] ?? null) ?? ($configEntry['username'] ?? null),
                'token_key' => (string) ($configEntry['token_env'] ?? $configEntry['token_key'] ?? ''),
                'webhook_secret' => $this->resolveEnvValue($configEntry['webhook_secret_env'] ?? null) ?? ($configEntry['webhook_secret'] ?? null),
                'environment' => (string) ($configEntry['environment'] ?? 'production'),
                'is_active' => true,
            ],
        );
    }

    private function resolveEnvValue(?string $envKey): ?string
    {
        if (blank($envKey)) {
            return null;
        }

        $value = env($envKey);

        return filled($value) ? (string) $value : null;
    }
}
