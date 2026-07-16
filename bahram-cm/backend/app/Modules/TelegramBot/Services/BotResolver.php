<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Exceptions\TelegramWebhookException;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Repositories\TelegramBotRepository;
use Illuminate\Support\Collection;

class BotResolver
{
    public function __construct(
        private readonly TelegramBotRepository $bots,
    ) {}

    public function resolve(string $key): TelegramBot
    {
        $bot = $this->bots->findByKey($key);

        if ($bot !== null) {
            return $bot;
        }

        $configEntry = $this->findConfigEntryByKey($key);

        if ($configEntry === null) {
            throw TelegramWebhookException::unknownBot($key);
        }

        return $this->bots->upsertFromConfig($key, $configEntry);
    }

    public function resolveDefault(): TelegramBot
    {
        return $this->resolve((string) config('telegram_bot.default_bot_key', 'production'));
    }

    /** @return Collection<int, TelegramBot> */
    public function syncAllFromConfig(): Collection
    {
        $synced = collect();

        foreach ((array) config('telegram_bot.bots', []) as $configKey => $entry) {
            $key = (string) ($entry['key'] ?? $configKey);
            $synced->push($this->bots->upsertFromConfig($key, $entry));
        }

        return $synced;
    }

    /** @return array<string, mixed>|null */
    private function findConfigEntryByKey(string $key): ?array
    {
        foreach ((array) config('telegram_bot.bots', []) as $configKey => $entry) {
            $entryKey = (string) ($entry['key'] ?? $configKey);

            if ($entryKey === $key) {
                return $entry;
            }
        }

        return null;
    }
}
