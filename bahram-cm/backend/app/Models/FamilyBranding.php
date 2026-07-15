<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FamilyBranding extends Model
{
    protected $table = 'family_branding';

    protected $fillable = [
        'display_name',
        'profile_name',
        'profile_avatar_path',
        'community_avatar_path',
    ];
}
