<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('family_stories', function (Blueprint $table) {
            $table->string('audience_mode')->default('all')->after('caption');
            $table->index(['audience_mode', 'expires_at']);
        });

        Schema::create('family_story_targets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('story_id')->constrained('family_stories')->cascadeOnDelete();
            $table->foreignId('family_id')->constrained('families')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['story_id', 'family_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('family_story_targets');

        Schema::table('family_stories', function (Blueprint $table) {
            $table->dropIndex(['audience_mode', 'expires_at']);
            $table->dropColumn('audience_mode');
        });
    }
};
