<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leads', function (Blueprint $table): void {
            $table->id();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('phone', 20);
            $table->string('normalized_phone', 20)->index();
            $table->string('city')->nullable();
            $table->string('source', 20)->default('website');
            $table->string('temperature', 10)->default('warm')->index();
            $table->unsignedTinyInteger('priority')->default(1);
            $table->string('stage', 20)->default('new');
            $table->string('status', 30)->default('new')->index();

            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('campaign_id')->nullable()->constrained()->nullOnDelete();

            $table->string('budget')->nullable();
            $table->string('job')->nullable();
            $table->string('experience', 20)->nullable();
            $table->string('income_goal')->nullable();
            $table->text('interest_reason')->nullable();
            $table->string('best_call_time')->nullable();

            $table->timestamp('last_call_at')->nullable();
            $table->unsignedInteger('call_count')->default(0);
            $table->text('last_note')->nullable();
            $table->unsignedTinyInteger('conversion_probability')->default(0);
            $table->text('pain_point')->nullable();
            $table->string('objection', 30)->nullable();
            $table->timestamp('next_followup_at')->nullable()->index();
            $table->unsignedTinyInteger('rating')->nullable();

            $table->foreignId('assigned_agent_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_team_id')->nullable()->constrained('teams')->nullOnDelete();

            $table->foreignId('locked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('locked_until')->nullable();
            $table->boolean('returned_to_pool')->default(false)->index();
            $table->timestamp('do_not_call_at')->nullable();
            $table->foreignId('duplicate_of_id')->nullable()->constrained('leads')->nullOnDelete();
            $table->json('metadata')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['assigned_agent_id', 'status']);
            $table->index(['status', 'temperature']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};
