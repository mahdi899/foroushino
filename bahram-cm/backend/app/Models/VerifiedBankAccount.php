<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VerifiedBankAccount extends Model
{
    protected $fillable = [
        'user_id',
        'card_number_encrypted',
        'card_last4',
        'iban_encrypted',
        'iban_last4',
        'bank_name',
        'holder_name',
        'verification_fee',
        'provider',
        'verified_at',
        'is_default',
    ];

    protected $casts = [
        'card_number_encrypted' => 'encrypted',
        'iban_encrypted' => 'encrypted',
        'verification_fee' => 'integer',
        'verified_at' => 'datetime',
        'is_default' => 'boolean',
    ];

    protected $hidden = [
        'card_number_encrypted',
        'iban_encrypted',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function payouts(): HasMany
    {
        return $this->hasMany(CashbackPayout::class);
    }

    public function setCardNumber(?string $rawCardNumber): void
    {
        $digits = preg_replace('/\D/', '', (string) $rawCardNumber) ?? '';

        if ($digits === '') {
            $this->card_number_encrypted = null;
            $this->card_last4 = null;

            return;
        }

        $this->card_number_encrypted = $digits;
        $this->card_last4 = substr($digits, -4);
    }

    public function setIban(?string $rawIban): void
    {
        $normalized = strtoupper(preg_replace('/\s+/', '', (string) $rawIban) ?? '');

        if ($normalized === '') {
            $this->iban_encrypted = null;
            $this->iban_last4 = null;

            return;
        }

        $this->iban_encrypted = $normalized;
        $this->iban_last4 = substr($normalized, -4);
    }

    public function getMaskedCardNumberAttribute(): ?string
    {
        if (blank($this->card_last4)) {
            return null;
        }

        $first4 = filled($this->card_number_encrypted) ? substr($this->card_number_encrypted, 0, 4) : '****';

        return "{$first4} **** **** {$this->card_last4}";
    }

    public function getMaskedIbanAttribute(): ?string
    {
        if (blank($this->iban_last4)) {
            return null;
        }

        return 'IR** **** **** **** **** **'.substr($this->iban_last4, -2);
    }
}
