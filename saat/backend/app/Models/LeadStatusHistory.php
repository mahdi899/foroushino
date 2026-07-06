<?php

namespace App\Models;

use App\Enums\LeadStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadStatusHistory extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['lead_id', 'status', 'by_user_id', 'note'];

    protected function casts(): array
    {
        return [
            'status' => LeadStatus::class,
            'created_at' => 'datetime',
        ];
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function byUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'by_user_id');
    }
}
