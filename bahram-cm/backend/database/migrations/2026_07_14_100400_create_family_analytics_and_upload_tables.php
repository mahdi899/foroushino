<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('family_media_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('post_id')->constrained('family_posts')->cascadeOnDelete();
            $table->foreignId('media_id')->constrained('family_media')->cascadeOnDelete();
            $table->unsignedInteger('last_position')->default(0);
            $table->unsignedInteger('max_position')->default(0);
            $table->unsignedTinyInteger('completion_percent')->default(0);
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'post_id', 'media_id']);
        });

        Schema::create('family_user_behavior_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->decimal('voice_completion_score', 5, 2)->default(0);
            $table->decimal('video_completion_score', 5, 2)->default(0);
            $table->decimal('reaction_score', 5, 2)->default(0);
            $table->decimal('comment_score', 5, 2)->default(0);
            $table->decimal('commitment_score', 5, 2)->default(0);
            $table->decimal('execution_score', 5, 2)->default(0);
            $table->decimal('sales_affinity', 5, 2)->default(0);
            $table->decimal('campaign_affinity', 5, 2)->default(0);
            $table->decimal('mindset_affinity', 5, 2)->default(0);
            $table->timestamp('calculated_at')->nullable();
            $table->timestamps();
        });

        Schema::create('family_dna_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('family_id')->constrained('families')->cascadeOnDelete();
            $table->date('period_start');
            $table->date('period_end');
            $table->decimal('voice_engagement', 8, 4)->default(0);
            $table->decimal('video_engagement', 8, 4)->default(0);
            $table->decimal('reaction_rate', 8, 4)->default(0);
            $table->decimal('comment_rate', 8, 4)->default(0);
            $table->decimal('action_commitment', 8, 4)->default(0);
            $table->decimal('action_completion', 8, 4)->default(0);
            $table->decimal('sales_interest', 8, 4)->default(0);
            $table->decimal('campaign_interest', 8, 4)->default(0);
            $table->decimal('mindset_interest', 8, 4)->default(0);
            $table->json('summary_json')->nullable();
            $table->timestamp('calculated_at')->nullable();
            $table->timestamps();

            $table->unique(['family_id', 'period_start', 'period_end'], 'family_dna_period_unique');
        });

        Schema::create('family_daily_metrics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('family_id')->nullable()->constrained('families')->cascadeOnDelete();
            $table->date('date');
            $table->unsignedInteger('new_members')->default(0);
            $table->unsignedInteger('posts_published')->default(0);
            $table->unsignedInteger('reactions')->default(0);
            $table->unsignedInteger('comments_approved')->default(0);
            $table->unsignedInteger('comments_pending')->default(0);
            $table->unsignedInteger('actions_completed')->default(0);
            $table->unsignedInteger('voice_plays')->default(0);
            $table->unsignedInteger('video_plays')->default(0);
            $table->timestamps();

            $table->unique(['family_id', 'date']);
        });

        Schema::create('family_post_daily_metrics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained('family_posts')->cascadeOnDelete();
            $table->foreignId('family_id')->nullable()->constrained('families')->cascadeOnDelete();
            $table->date('date');
            $table->unsignedInteger('reactions')->default(0);
            $table->unsignedInteger('comments')->default(0);
            $table->unsignedInteger('action_responses')->default(0);
            $table->unsignedInteger('voice_completions')->default(0);
            $table->unsignedInteger('video_completions')->default(0);
            $table->timestamps();

            $table->unique(['post_id', 'family_id', 'date'], 'family_post_daily_unique');
        });

        Schema::create('family_source_daily_metrics', function (Blueprint $table) {
            $table->id();
            $table->string('source');
            $table->date('date');
            $table->unsignedInteger('joins')->default(0);
            $table->timestamps();

            $table->unique(['source', 'date']);
        });

        Schema::create('family_entry_event_daily_metrics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entry_event_id')->constrained('family_entry_events')->cascadeOnDelete();
            $table->date('date');
            $table->unsignedInteger('joins')->default(0);
            $table->timestamps();

            $table->unique(['entry_event_id', 'date'], 'family_entry_event_daily_unique');
        });

        Schema::create('family_media_upload_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('ulid', 26)->unique();
            $table->foreignId('uploaded_by')->constrained('users')->cascadeOnDelete();
            $table->string('type');
            $table->string('original_filename');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('total_size');
            $table->unsignedInteger('chunk_size');
            $table->unsignedInteger('total_chunks');
            $table->unsignedInteger('received_chunks')->default(0);
            $table->string('temp_path');
            $table->string('status')->default('uploading');
            $table->foreignId('media_id')->nullable()->constrained('family_media')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('family_media_upload_sessions');
        Schema::dropIfExists('family_entry_event_daily_metrics');
        Schema::dropIfExists('family_source_daily_metrics');
        Schema::dropIfExists('family_post_daily_metrics');
        Schema::dropIfExists('family_daily_metrics');
        Schema::dropIfExists('family_dna_snapshots');
        Schema::dropIfExists('family_user_behavior_profiles');
        Schema::dropIfExists('family_media_progress');
    }
};
