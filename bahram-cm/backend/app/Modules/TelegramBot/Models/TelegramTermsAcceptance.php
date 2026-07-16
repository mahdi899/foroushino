<?php

namespace App\Modules\TelegramBot\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramTermsAcceptance extends Model
{
    protected $fillable = [
        'telegram_account_id',
        'telegram_legal_document_id',
        'accepted_at',
        'ip_address',
    ];

    protected function casts(): array
    {
        return [
            'accepted_at' => 'datetime',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(TelegramAccount::class, 'telegram_account_id');
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(TelegramLegalDocument::class, 'telegram_legal_document_id');
    }
}
