<?php

namespace App\Modules\TelegramBot\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TelegramLegalDocument extends Model
{
    protected $fillable = [
        'key',
        'version',
        'title',
        'content',
        'url',
        'is_active',
        'effective_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'effective_at' => 'datetime',
        ];
    }

    public function acceptances(): HasMany
    {
        return $this->hasMany(TelegramTermsAcceptance::class);
    }
}
