<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('family_branding')) {
            Schema::create('family_branding', function (Blueprint $table) {
                $table->id();
                $table->string('display_name');
                $table->string('profile_name');
                $table->string('profile_avatar_path')->nullable();
                $table->string('community_avatar_path')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('family_stories')) {
            Schema::create('family_stories', function (Blueprint $table) {
                $table->id();
                $table->foreignId('media_id')->constrained('family_media')->cascadeOnDelete();
                $table->text('caption')->nullable();
                $table->foreignId('published_by')->constrained('users')->cascadeOnDelete();
                $table->dateTime('published_at');
                $table->dateTime('expires_at');
                $table->timestamps();

                $table->index(['expires_at', 'published_at']);
            });
        }

        Schema::table('family_posts', function (Blueprint $table) {
            if (! Schema::hasColumn('family_posts', 'is_pinned')) {
                $table->boolean('is_pinned')->default(false)->after('is_important');
            }
            if (! Schema::hasColumn('family_posts', 'pinned_at')) {
                $table->timestamp('pinned_at')->nullable()->after('is_pinned');
            }
        });

        Schema::table('family_posts', function (Blueprint $table) {
            if (Schema::hasColumn('family_posts', 'is_pinned') && Schema::hasColumn('family_posts', 'pinned_at')) {
                $table->index(['is_pinned', 'pinned_at']);
            }
        });
    }

    public function down(): void
    {
        Schema::table('family_posts', function (Blueprint $table) {
            $table->dropIndex(['is_pinned', 'pinned_at']);
            $table->dropColumn(['is_pinned', 'pinned_at']);
        });

        Schema::dropIfExists('family_stories');
        Schema::dropIfExists('family_branding');
    }
};
