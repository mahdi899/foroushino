<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('articles')
            ->where('slug', 'family-demo-growth-habits')
            ->update(['is_indexable' => true]);
    }

    public function down(): void
    {
        DB::table('articles')
            ->where('slug', 'family-demo-growth-habits')
            ->update(['is_indexable' => false]);
    }
};
