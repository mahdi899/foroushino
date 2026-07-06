<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use App\Enums\SaleStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Sale extends Model
{
    use HasFactory;

    protected $fillable = [
        'lead_id', 'agent_id', 'team_id', 'product_id', 'amount', 'status',
        'payment_method', 'submitted_at', 'confirmed_at', 'confirmed_by',
        'rejected_at', 'rejection_reason',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'status' => SaleStatus::class,
            'payment_method' => PaymentMethod::class,
            'submitted_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'rejected_at' => 'datetime',
        ];
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'agent_id');
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function confirmedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function commission(): HasOne
    {
        return $this->hasOne(Commission::class);
    }
}
