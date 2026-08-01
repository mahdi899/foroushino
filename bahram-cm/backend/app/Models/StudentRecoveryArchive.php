<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentRecoveryArchive extends Model
{
    protected $fillable = [
        'original_user_id',
        'deleted_by_user_id',
        'display_name',
        'mobile',
        'snapshot',
        'purge_at',
        'purged_at',
    ];

    protected $casts = [
        'snapshot' => 'array',
        'purge_at' => 'datetime',
        'purged_at' => 'datetime',
    ];

    public function deletedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by_user_id');
    }
}
