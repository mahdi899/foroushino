<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('family_posts', function (Blueprint $table) {
            $table->boolean('comments_enabled')->default(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('family_posts', function (Blueprint $table) {
            $table->boolean('comments_enabled')->default(true)->change();
        });
    }
};
