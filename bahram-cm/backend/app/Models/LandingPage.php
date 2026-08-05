<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LandingPage extends Model
{
    protected $fillable = [
        'slug',
        'title',
        'subtitle',
        'body',
        'hero_image',
        'submit_label',
        'success_message',
        'form_fields',
        'is_published',
        'published_at',
    ];

    protected $casts = [
        'form_fields' => 'array',
        'is_published' => 'boolean',
        'published_at' => 'datetime',
    ];

    /** Default optional-field toggles when a page has none configured yet. */
    public static function defaultFormFields(): array
    {
        return [
            'message' => false,
            'email' => false,
        ];
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }
}
