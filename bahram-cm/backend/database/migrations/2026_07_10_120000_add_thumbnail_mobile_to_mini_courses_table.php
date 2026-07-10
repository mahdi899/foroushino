<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mini_courses', function (Blueprint $table) {
            $table->string('thumbnail_mobile')->nullable()->after('thumbnail');
        });
    }

    public function down(): void
    {
        Schema::table('mini_courses', function (Blueprint $table) {
            $table->dropColumn('thumbnail_mobile');
        });
    }
};
