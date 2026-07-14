<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('family_reactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained('family_posts')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('family_id')->constrained('families')->cascadeOnDelete();
            $table->string('type');
            $table->timestamps();

            $table->unique(['post_id', 'user_id']);
            $table->index(['post_id', 'family_id', 'type']);
        });

        Schema::create('family_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained('family_posts')->cascadeOnDelete();
            $table->foreignId('family_id')->constrained('families')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->text('body');
            $table->string('status')->default('pending');
            $table->string('rejection_reason')->nullable();
            $table->text('rejection_note')->nullable();
            $table->decimal('ai_risk_score', 5, 2)->nullable();
            $table->string('ai_sentiment')->nullable();
            $table->string('ai_topic')->nullable();
            $table->json('ai_signals')->nullable();
            $table->boolean('is_important')->default(false);
            $table->timestamp('featured_at')->nullable();
            $table->timestamp('family_pulse_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamp('seen_by_bahram_at')->nullable();
            $table->foreignId('moderated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['post_id', 'family_id', 'status', 'created_at']);
            $table->index(['status', 'created_at']);
            $table->index(['family_id', 'status']);
            $table->index('family_pulse_at');
        });

        Schema::table('family_posts', function (Blueprint $table) {
            $table->foreign('reply_to_comment_id')
                ->references('id')
                ->on('family_comments')
                ->nullOnDelete();
        });

        Schema::table('family_post_blocks', function (Blueprint $table) {
            $table->foreign('comment_id')
                ->references('id')
                ->on('family_comments')
                ->nullOnDelete();
        });

        Schema::create('family_post_stats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained('family_posts')->cascadeOnDelete();
            $table->foreignId('family_id')->constrained('families')->cascadeOnDelete();
            $table->unsignedInteger('fire_count')->default(0);
            $table->unsignedInteger('heart_count')->default(0);
            $table->unsignedInteger('target_count')->default(0);
            $table->unsignedInteger('clap_count')->default(0);
            $table->unsignedInteger('approved_comments_count')->default(0);
            $table->unsignedInteger('action_responses_count')->default(0);
            $table->timestamps();

            $table->unique(['post_id', 'family_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('family_post_stats');

        Schema::table('family_post_blocks', function (Blueprint $table) {
            $table->dropForeign(['comment_id']);
        });

        Schema::table('family_posts', function (Blueprint $table) {
            $table->dropForeign(['reply_to_comment_id']);
        });

        Schema::dropIfExists('family_comments');
        Schema::dropIfExists('family_reactions');
    }
};
