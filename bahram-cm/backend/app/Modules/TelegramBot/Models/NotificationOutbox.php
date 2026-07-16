<?php

namespace App\Modules\TelegramBot\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class NotificationOutbox extends Model
{
    protected $table = 'notification_outbox';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'event_type',
        'user_id',
        'payload',
        'requested_channels',
        'idempotency_key',
        'status',
        'available_at',
        'attempts',
        'last_error',
        'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'requested_channels' => 'array',
            'available_at' => 'datetime',
            'processed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $model): void {
            if (blank($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }
}
