<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

class IdentityProviderConfig extends Model
{
    protected $fillable = [
        'slug',
        'label',
        'capabilities',
        'credentials_encrypted',
        'settings',
        'is_enabled',
        'last_test_status',
        'last_tested_at',
        'last_test_message',
    ];

    protected $hidden = [
        'credentials_encrypted',
    ];

    protected $appends = [
        'credentials_configured',
    ];

    protected function casts(): array
    {
        return [
            'capabilities' => 'array',
            'credentials_encrypted' => 'encrypted:array',
            'settings' => 'array',
            'is_enabled' => 'boolean',
            'last_tested_at' => 'datetime',
        ];
    }

    /** API-safe flag; never exposes credential values. */
    protected function credentialsConfigured(): Attribute
    {
        return Attribute::get(fn (): bool => $this->hasCredentials());
    }

    public function setCredentials(array $credentials): void
    {
        $this->credentials_encrypted = $credentials;
    }

    public function hasCredentials(): bool
    {
        $credentials = $this->credentials_encrypted;

        return is_array($credentials) && $credentials !== [];
    }

    /**
     * Server-only decrypted credentials. Do not serialize to API responses.
     *
     * @return array<string, mixed>
     */
    public function getCredentials(): array
    {
        $credentials = $this->credentials_encrypted;

        return is_array($credentials) ? $credentials : [];
    }

    public function toArray(): array
    {
        $array = parent::toArray();
        unset($array['credentials_encrypted']);
        $array['credentials_configured'] = $this->hasCredentials();

        return $array;
    }
}
