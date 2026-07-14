<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadScore extends Model
{
    protected $fillable = ['lead_id', 'score', 'factors', 'model_version', 'computed_at'];

    protected function casts(): array
    {
        return [
            'factors' => 'array',
            'computed_at' => 'datetime',
        ];
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
