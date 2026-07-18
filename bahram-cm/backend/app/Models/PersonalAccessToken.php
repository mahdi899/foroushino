<?php

namespace App\Models;

use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\PersonalAccessToken as SanctumPersonalAccessToken;

/**
 * Every authenticated API request — admin panel SPA and the Flutter
 * family-manager app alike — makes Sanctum's `Guard` resolve the bearer
 * token to this model via a DB lookup by hashed token, on every single
 * request. Cache that lookup for a short window to cut one query per
 * request under load, while still invalidating immediately on logout /
 * revocation (`delete()`) or any change other than the routine
 * `last_used_at` touch Sanctum itself performs after every successful auth
 * (`updateLastUsedAt()` in vendor `Guard.php` — skipped here on purpose so
 * caching it wouldn't defeat the whole point).
 */
class PersonalAccessToken extends SanctumPersonalAccessToken
{
    private const CACHE_TTL_SECONDS = 60;

    public static function findToken($token)
    {
        $cacheKey = self::cacheKeyForHash(self::hashOf($token));

        $cached = Cache::get($cacheKey);
        if ($cached instanceof self) {
            return $cached;
        }

        $instance = parent::findToken($token);

        if ($instance instanceof self) {
            Cache::put($cacheKey, $instance, self::CACHE_TTL_SECONDS);
        }

        return $instance;
    }

    public function save(array $options = [])
    {
        $onlyTouchedLastUsedAt = $this->exists
            && $this->isDirty()
            && array_keys($this->getDirty()) === ['last_used_at'];

        $saved = parent::save($options);

        if ($saved && ! $onlyTouchedLastUsedAt && $this->token) {
            Cache::forget(self::cacheKeyForHash($this->token));
        }

        return $saved;
    }

    public function delete()
    {
        if ($this->token) {
            Cache::forget(self::cacheKeyForHash($this->token));
        }

        return parent::delete();
    }

    /** Mirrors the hashing Sanctum's own `findToken()` uses, for both the "id|secret" and legacy plain formats. */
    private static function hashOf(string $token): string
    {
        if (! str_contains($token, '|')) {
            return hash('sha256', $token);
        }

        [, $secret] = explode('|', $token, 2);

        return hash('sha256', $secret);
    }

    private static function cacheKeyForHash(string $hash): string
    {
        return 'sanctum-token:'.$hash;
    }
}
