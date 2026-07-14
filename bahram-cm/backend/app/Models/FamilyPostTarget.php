<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FamilyPostTarget extends Model
{
    protected $fillable = [
        'post_id',
        'family_id',
    ];

    public function post(): BelongsTo
    {
        return $this->belongsTo(FamilyPost::class, 'post_id');
    }

    public function family(): BelongsTo
    {
        return $this->belongsTo(Family::class);
    }
}
