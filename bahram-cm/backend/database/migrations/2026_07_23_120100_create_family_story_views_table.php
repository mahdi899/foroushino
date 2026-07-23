<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('family_story_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('story_id')->constrained('family_stories')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('viewed_at');
            $table->unique(['story_id', 'user_id']);
            $table->index(['story_id', 'viewed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('family_story_views');
    }
};
