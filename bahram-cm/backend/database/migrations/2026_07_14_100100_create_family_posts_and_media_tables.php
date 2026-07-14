<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('family_media', function (Blueprint $table) {
            $table->id();
            $table->string('type');
            $table->string('disk')->default('family_media_ftp');
            $table->string('storage_path')->nullable();
            $table->string('temp_path')->nullable();
            $table->string('original_filename')->nullable();
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->unsignedInteger('duration')->nullable();
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->json('waveform')->nullable();
            $table->string('status')->default('uploading');
            $table->text('failure_reason')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'type']);
            $table->index('storage_path');
        });

        Schema::create('family_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();
            $table->string('type');
            $table->string('status')->default('draft');
            $table->string('audience_mode')->default('all');
            $table->boolean('is_important')->default(false);
            $table->foreignId('reply_to_comment_id')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'published_at', 'id']);
            $table->index(['audience_mode', 'status']);
            $table->index('reply_to_comment_id');
        });

        Schema::create('family_post_blocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained('family_posts')->cascadeOnDelete();
            $table->string('type');
            $table->unsignedInteger('position')->default(0);
            $table->text('text_content')->nullable();
            $table->foreignId('media_id')->nullable()->constrained('family_media')->nullOnDelete();
            $table->foreignId('article_id')->nullable()->constrained('articles')->nullOnDelete();
            $table->foreignId('comment_id')->nullable();
            $table->foreignId('action_id')->nullable();
            $table->json('data')->nullable();
            $table->timestamps();

            $table->index(['post_id', 'position']);
        });

        Schema::create('family_post_targets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained('family_posts')->cascadeOnDelete();
            $table->foreignId('family_id')->constrained('families')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['post_id', 'family_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('family_post_targets');
        Schema::dropIfExists('family_post_blocks');
        Schema::dropIfExists('family_posts');
        Schema::dropIfExists('family_media');
    }
};
