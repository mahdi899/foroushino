<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('family_post_stats', function (Blueprint $table) {
            $table->unsignedInteger('views_count')->default(0)->after('action_responses_count');
        });

        Schema::create('family_post_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained('family_posts')->cascadeOnDelete();
            $table->foreignId('family_id')->constrained('families')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('viewed_at');
            $table->timestamps();

            $table->unique(['post_id', 'family_id', 'user_id']);
            $table->index(['post_id', 'family_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('family_post_views');

        Schema::table('family_post_stats', function (Blueprint $table) {
            $table->dropColumn('views_count');
        });
    }
};
