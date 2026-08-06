<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Lead extends Model
{
    protected $fillable = [
        'landing_page_id',
        'family_id',
        'name',
        'phone',
        'email',
        'source',
        'message',
        'page_url',
        'status',
        'assigned_at',
        'meta',
    ];

    protected $casts = [
        'meta' => 'array',
        'assigned_at' => 'datetime',
    ];

    public function landingPage(): BelongsTo
    {
        return $this->belongsTo(LandingPage::class);
    }

    public function family(): BelongsTo
    {
        return $this->belongsTo(Family::class);
    }
}
