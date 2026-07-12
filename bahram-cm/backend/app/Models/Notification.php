<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Custom in-app notification broadcast to a group of students. Distinct from
 * Illuminate\Notifications\Notification (the polymorphic DB channel), which
 * this project does not use.
 */
class Notification extends Model
{
    protected $fillable = [
        'title',
        'body',
        'type',
        'link',
        'link_label',
        'created_by',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function recipients(): HasMany
    {
        return $this->hasMany(NotificationRecipient::class);
    }
}
