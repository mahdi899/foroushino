<?php

namespace App\Models;

use App\Enums\IdentityCapability;
use Illuminate\Database\Eloquent\Model;

class IdentityVerificationRoute extends Model
{
    protected $fillable = [
        'capability',
        'primary_provider',
        'fallback_provider',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'capability' => IdentityCapability::class,
            'is_active' => 'boolean',
        ];
    }
}
