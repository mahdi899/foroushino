<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('family_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained('family_posts')->cascadeOnDelete();
            $table->string('type');
            $table->string('prompt');
            $table->json('config')->nullable();
            $table->unsignedInteger('follow_up_after_minutes')->nullable();
            $table->string('follow_up_message')->nullable();
            $table->timestamps();

            $table->index('post_id');
        });

        Schema::table('family_post_blocks', function (Blueprint $table) {
            $table->foreign('action_id')
                ->references('id')
                ->on('family_actions')
                ->nullOnDelete();
        });

        Schema::create('family_action_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('action_id')->constrained('family_actions')->cascadeOnDelete();
            $table->string('label');
            $table->string('value');
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();

            $table->index(['action_id', 'position']);
        });

        Schema::create('family_action_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('action_id')->constrained('family_actions')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('family_id')->constrained('families')->cascadeOnDelete();
            $table->json('value');
            $table->boolean('follow_up_sent')->default(false);
            $table->timestamp('follow_up_sent_at')->nullable();
            $table->timestamps();

            $table->unique(['action_id', 'user_id']);
            $table->index(['action_id', 'follow_up_sent']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('family_action_responses');
        Schema::dropIfExists('family_action_options');

        Schema::table('family_post_blocks', function (Blueprint $table) {
            $table->dropForeign(['action_id']);
        });

        Schema::dropIfExists('family_actions');
    }
};
