<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FamilySourceDailyMetric extends Model
{
    protected $fillable = ['source', 'date', 'joins'];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'joins' => 'integer',
        ];
    }
}
