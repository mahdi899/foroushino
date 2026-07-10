<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seminars', function (Blueprint $table) {
            $table->string('banner_available_mobile')->nullable()->after('banner_available');
            $table->string('banner_full_mobile')->nullable()->after('banner_full');
        });
    }

    public function down(): void
    {
        Schema::table('seminars', function (Blueprint $table) {
            $table->dropColumn(['banner_available_mobile', 'banner_full_mobile']);
        });
    }
};
