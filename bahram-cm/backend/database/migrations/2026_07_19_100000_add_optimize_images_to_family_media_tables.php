<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('family_media', function (Blueprint $table) {
            $table->boolean('optimize_images')->nullable()->after('mime_type');
        });

        Schema::table('family_media_upload_sessions', function (Blueprint $table) {
            $table->boolean('optimize_images')->nullable()->after('mime_type');
        });
    }

    public function down(): void
    {
        Schema::table('family_media_upload_sessions', function (Blueprint $table) {
            $table->dropColumn('optimize_images');
        });

        Schema::table('family_media', function (Blueprint $table) {
            $table->dropColumn('optimize_images');
        });
    }
};
