<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('family_post_targets', function (Blueprint $table) {
            // Feed audience EXISTS subqueries filter by family_id first.
            $table->index(['family_id', 'post_id'], 'family_post_targets_family_post_idx');
        });

        Schema::table('family_media', function (Blueprint $table) {
            $table->string('thumbnail_path')->nullable()->after('storage_path');
        });
    }

    public function down(): void
    {
        Schema::table('family_post_targets', function (Blueprint $table) {
            $table->dropIndex('family_post_targets_family_post_idx');
        });

        Schema::table('family_media', function (Blueprint $table) {
            $table->dropColumn('thumbnail_path');
        });
    }
};
