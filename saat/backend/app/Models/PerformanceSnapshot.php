<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PerformanceSnapshot extends Model
{
    protected $fillable = [
        'user_id', 'date', 'calls_count', 'successful_count', 'conversion_rate',
        'avg_talk_sec', 'note_quality', 'hot_leads', 'overdue_followups',
        'confirmed_sales', 'approved_commission', 'score',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'conversion_rate' => 'decimal:2',
            'note_quality' => 'decimal:2',
            'approved_commission' => 'decimal:2',
            'score' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
