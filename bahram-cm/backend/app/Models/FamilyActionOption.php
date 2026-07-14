<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FamilyActionOption extends Model
{
    protected $fillable = [
        'action_id',
        'label',
        'value',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'position' => 'integer',
        ];
    }

    public function action(): BelongsTo
    {
        return $this->belongsTo(FamilyAction::class, 'action_id');
    }
}
