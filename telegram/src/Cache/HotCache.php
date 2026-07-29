<?php

declare(strict_types=1);

namespace TelegramHost\Cache;

/**
 * Optional Redis L2 in front of MySQL for bot messages, feature flags, and catalog.
 * Falls back silently when redis extension is missing or disabled in config.
 */
final class HotCache
{
    private const TTL_SECONDS = 86400;

    private ?\Redis $redis = null;

    private readonly bool $enabled;

    private readonly string $prefix;

    /** @param array<string, mixed>|null $config */
    public function __construct(?array $config)
    {
        $redisConfig = is_array($config['redis'] ?? null) ? $config['redis'] : [];
        $this->prefix = (string) ($redisConfig['prefix'] ?? 'tg:');
        $this->enabled = (bool) ($redisConfig['enabled'] ?? false) && class_exists(\Redis::class);

        if (! $this->enabled) {
            return;
        }

        try {
            $client = new \Redis;
            $host = (string) ($redisConfig['host'] ?? '127.0.0.1');
            $port = (int) ($redisConfig['port'] ?? 6379);
            if (! $client->connect($host, $port, 1.0)) {
                throw new \RuntimeException('connect failed');
            }
            $password = $redisConfig['password'] ?? null;
            if (is_string($password) && $password !== '') {
                $client->auth($password);
            }
            $database = (int) ($redisConfig['database'] ?? 0);
            if ($database > 0) {
                $client->select($database);
            }
            $this->redis = $client;
        } catch (\Throwable $e) {
            error_log('[telegram-host] redis init: '.$e->getMessage());
            $this->redis = null;
        }
    }

    public function isActive(): bool
    {
        return $this->redis !== null;
    }

    public function getMessage(string $key): ?string
    {
        if ($this->redis === null) {
            return null;
        }

        try {
            $value = $this->redis->hGet($this->key('messages'), $key);

            return is_string($value) && $value !== '' ? $value : null;
        } catch (\Throwable) {
            return null;
        }
    }

    /** @param array<string, string> $messages */
    public function storeMessages(array $messages): void
    {
        if ($this->redis === null || $messages === []) {
            return;
        }

        try {
            $hashKey = $this->key('messages');
            $this->redis->del($hashKey);
            $this->redis->hMSet($hashKey, $messages);
            $this->redis->expire($hashKey, self::TTL_SECONDS);
        } catch (\Throwable $e) {
            error_log('[telegram-host] redis messages: '.$e->getMessage());
        }
    }

    public function getFeatureFlag(string $key): ?bool
    {
        if ($this->redis === null) {
            return null;
        }

        try {
            $value = $this->redis->hGet($this->key('flags'), $key);
            if ($value === false) {
                return null;
            }

            return (int) $value === 1;
        } catch (\Throwable) {
            return null;
        }
    }

    /** @param array<string, bool> $flags */
    public function storeFeatureFlags(array $flags): void
    {
        if ($this->redis === null || $flags === []) {
            return;
        }

        try {
            $hashKey = $this->key('flags');
            $encoded = [];
            foreach ($flags as $key => $enabled) {
                $encoded[(string) $key] = $enabled ? '1' : '0';
            }
            $this->redis->del($hashKey);
            $this->redis->hMSet($hashKey, $encoded);
            $this->redis->expire($hashKey, self::TTL_SECONDS);
        } catch (\Throwable $e) {
            error_log('[telegram-host] redis flags: '.$e->getMessage());
        }
    }

    /** @return list<array<string, mixed>>|null */
    public function getCatalogProducts(): ?array
    {
        return $this->getJsonList($this->key('catalog:products'));
    }

    /** @param list<array<string, mixed>> $products */
    public function storeCatalogProducts(array $products): void
    {
        $this->storeJsonList($this->key('catalog:products'), $products);
    }

    /** @return list<array<string, mixed>>|null */
    public function getCatalogSeminars(): ?array
    {
        return $this->getJsonList($this->key('catalog:seminars'));
    }

    /** @param list<array<string, mixed>> $seminars */
    public function storeCatalogSeminars(array $seminars): void
    {
        $this->storeJsonList($this->key('catalog:seminars'), $seminars);
    }

    public function invalidateBootstrap(): void
    {
        if ($this->redis === null) {
            return;
        }

        try {
            $this->redis->del($this->key('messages'), $this->key('flags'));
        } catch (\Throwable) {
        }
    }

    public function invalidateCatalog(): void
    {
        if ($this->redis === null) {
            return;
        }

        try {
            $this->redis->del($this->key('catalog:products'), $this->key('catalog:seminars'));
        } catch (\Throwable) {
        }
    }

    /** @return list<array<string, mixed>>|null */
    private function getJsonList(string $key): ?array
    {
        if ($this->redis === null) {
            return null;
        }

        try {
            $raw = $this->redis->get($key);
            if (! is_string($raw) || $raw === '') {
                return null;
            }
            $decoded = json_decode($raw, true);

            return is_array($decoded) ? $decoded : null;
        } catch (\Throwable) {
            return null;
        }
    }

    /** @param list<array<string, mixed>> $items */
    private function storeJsonList(string $key, array $items): void
    {
        if ($this->redis === null) {
            return;
        }

        try {
            $json = json_encode($items, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if ($json === false) {
                return;
            }
            $this->redis->setex($key, self::TTL_SECONDS, $json);
        } catch (\Throwable $e) {
            error_log('[telegram-host] redis json: '.$e->getMessage());
        }
    }

    private function key(string $suffix): string
    {
        return $this->prefix.$suffix;
    }
}
