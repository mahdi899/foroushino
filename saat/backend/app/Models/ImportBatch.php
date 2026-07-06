<?php

namespace App\Models;

use App\Enums\ImportStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ImportBatch extends Model
{
    protected $fillable = [
        'created_by', 'source_filename', 'total_rows', 'imported_count',
        'duplicate_count', 'error_count', 'status', 'errors',
    ];

    protected function casts(): array
    {
        return [
            'status' => ImportStatus::class,
            'errors' => 'array',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }
}
