<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('family_entry_events', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type');
            $table->string('external_reference')->nullable()->index();
            $table->string('topic')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();

            $table->index(['type', 'started_at']);
        });

        Schema::create('families', function (Blueprint $table) {
            $table->id();
            $table->string('internal_name');
            $table->string('lifecycle')->default('forming');
            $table->unsignedInteger('member_count')->default(0);
            $table->unsignedInteger('capacity_target')->default(5000);
            $table->unsignedInteger('capacity_min')->default(4500);
            $table->unsignedInteger('capacity_max')->default(5200);
            $table->string('primary_source')->nullable();
            $table->foreignId('entry_event_id')->nullable()->constrained('family_entry_events')->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['lifecycle', 'member_count']);
            $table->index('primary_source');
        });

        Schema::create('family_memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('family_id')->constrained('families')->cascadeOnDelete();
            $table->string('entry_source')->nullable();
            $table->string('entry_campaign')->nullable();
            $table->string('entry_content')->nullable();
            $table->string('entry_referrer')->nullable();
            $table->foreignId('entry_event_id')->nullable()->constrained('family_entry_events')->nullOnDelete();
            $table->decimal('assignment_score', 8, 4)->nullable();
            $table->boolean('onboarding_completed')->default(false);
            $table->timestamp('onboarding_completed_at')->nullable();
            $table->timestamp('joined_at');
            $table->timestamps();

            $table->unique('user_id');
            $table->index(['family_id', 'joined_at']);
            $table->index('entry_source');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('family_memberships');
        Schema::dropIfExists('families');
        Schema::dropIfExists('family_entry_events');
    }
};
