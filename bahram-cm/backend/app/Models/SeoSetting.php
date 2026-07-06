<?php

namespace App\Models;

use App\Models\Concerns\IsSingletonSetting;
use Illuminate\Database\Eloquent\Model;

class SeoSetting extends Model
{
    use IsSingletonSetting;

    protected $fillable = [
        'robots_txt',
        'sitemap_xml',
        'sitemap_generated_at',
    ];

    protected $casts = [
        'sitemap_generated_at' => 'datetime',
    ];
}
