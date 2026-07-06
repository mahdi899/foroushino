<?php

namespace App\Models;

use App\Enums\WalletTxType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WalletTransaction extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id', 'type', 'amount', 'description', 'reference_type', 'reference_id',
    ];

    protected function casts(): array
    {
        return [
            'type' => WalletTxType::class,
            'amount' => 'decimal:2',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
