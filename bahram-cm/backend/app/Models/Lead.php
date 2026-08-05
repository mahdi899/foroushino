<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Lead extends Model
{
    protected $fillable = [
        'landing_page_id',
        'name',
        'phone',
        'email',
        'source',
        'message',
        'page_url',
        'status',
        'meta',
    ];

    protected $casts = [
        'meta' => 'array',
    ];

    public function landingPage(): BelongsTo
    {
        return $this->belongsTo(LandingPage::class);
    }
}
