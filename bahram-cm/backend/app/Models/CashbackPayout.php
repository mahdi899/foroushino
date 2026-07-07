<?php

namespace App\Models;

use App\Enums\CashbackPayoutStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashbackPayout extends Model
{
    protected $fillable = [
        'user_id',
        'amount',
        'card_number_encrypted',
        'card_last4',
        'card_holder_name',
        'status',
        'admin_note',
        'paid_at',
    ];

    protected $casts = [
        'amount' => 'integer',
        'card_number_encrypted' => 'encrypted',
        'status' => CashbackPayoutStatus::class,
        'paid_at' => 'datetime',
    ];

    protected $hidden = [
        'card_number_encrypted',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Sets the encrypted card number and derives the masked last-4 digits. */
    public function setCardNumber(string $rawCardNumber): void
    {
        $digits = preg_replace('/\D/', '', $rawCardNumber) ?? '';

        $this->card_number_encrypted = $digits;
        $this->card_last4 = substr($digits, -4);
    }

    /** Masked form for student-facing display, e.g. "6037 **** **** 1234". */
    public function getMaskedCardNumberAttribute(): ?string
    {
        if (blank($this->card_last4)) {
            return null;
        }

        $first4 = filled($this->card_number_encrypted) ? substr($this->card_number_encrypted, 0, 4) : '****';

        return "{$first4} **** **** {$this->card_last4}";
    }
}
