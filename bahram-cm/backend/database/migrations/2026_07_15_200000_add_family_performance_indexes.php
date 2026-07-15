<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('family_posts', function (Blueprint $table) {
            $table->index(['status', 'is_pinned', 'published_at', 'id'], 'family_posts_feed_idx');
        });

        Schema::table('family_comments', function (Blueprint $table) {
            $table->index(['post_id', 'family_id', 'status', 'id'], 'family_comments_preview_idx');
        });

        Schema::table('family_action_responses', function (Blueprint $table) {
            $table->index(['family_id', 'action_id'], 'family_action_responses_family_action_idx');
        });
    }

    public function down(): void
    {
        Schema::table('family_posts', function (Blueprint $table) {
            $table->dropIndex('family_posts_feed_idx');
        });

        Schema::table('family_comments', function (Blueprint $table) {
            $table->dropIndex('family_comments_preview_idx');
        });

        Schema::table('family_action_responses', function (Blueprint $table) {
            $table->dropIndex('family_action_responses_family_action_idx');
        });
    }
};
