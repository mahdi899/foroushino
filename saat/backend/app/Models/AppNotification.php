<?php

namespace App\Models;

use App\Enums\NotificationKind;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppNotification extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'app_notifications';

    protected $fillable = ['user_id', 'kind', 'title', 'body', 'href', 'read'];

    protected function casts(): array
    {
        return [
            'kind' => NotificationKind::class,
            'read' => 'boolean',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
