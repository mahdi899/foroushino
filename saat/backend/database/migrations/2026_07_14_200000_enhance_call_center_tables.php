<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('calls', function (Blueprint $table): void {
            $table->string('method', 20)->default('native')->after('agent_id');
            $table->string('state', 20)->default('created')->after('method');
            $table->string('provider_call_id')->nullable()->after('state');
            $table->timestamp('answered_at')->nullable()->after('started_at');
            $table->string('duration_source', 20)->default('unverified')->after('duration_sec');
            $table->string('disconnect_reason', 40)->nullable()->after('duration_source');
            $table->string('correlation_id', 64)->nullable()->index()->after('idempotency_key');
        });

        Schema::create('call_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('call_id')->constrained()->cascadeOnDelete();
            $table->string('event', 40);
            $table->json('payload')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamps();

            $table->index(['call_id', 'occurred_at']);
        });

        Schema::table('campaigns', function (Blueprint $table): void {
            $table->unsignedSmallInteger('priority')->default(50)->after('is_active');
            $table->unsignedTinyInteger('max_daily_attempts')->default(3)->after('priority');
            $table->unsignedTinyInteger('max_total_attempts')->default(12)->after('max_daily_attempts');
            $table->unsignedSmallInteger('retry_cooldown_minutes')->default(60)->after('max_total_attempts');
            $table->string('allowed_hours_start', 5)->default('08:00')->after('retry_cooldown_minutes');
            $table->string('allowed_hours_end', 5)->default('23:59')->after('allowed_hours_start');
            $table->unsignedSmallInteger('sla_callback_minutes')->default(120)->after('allowed_hours_end');
        });

        Schema::create('quality_reviews', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('call_id')->constrained()->cascadeOnDelete();
            $table->foreignId('reviewer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('agent_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('score')->default(0);
            $table->json('criteria_scores')->nullable();
            $table->text('notes')->nullable();
            $table->string('status', 20)->default('pending');
            $table->text('dispute_reason')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['agent_id', 'status']);
        });

        Schema::create('coaching_tasks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('agent_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('coach_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('quality_review_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('status', 20)->default('open');
            $table->timestamp('due_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('lead_scores', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('lead_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('score')->default(50);
            $table->json('factors')->nullable();
            $table->string('model_version', 40)->default('heuristic-v1');
            $table->timestamp('computed_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_scores');
        Schema::dropIfExists('coaching_tasks');
        Schema::dropIfExists('quality_reviews');
        Schema::table('campaigns', function (Blueprint $table): void {
            $table->dropColumn([
                'priority',
                'max_daily_attempts',
                'max_total_attempts',
                'retry_cooldown_minutes',
                'allowed_hours_start',
                'allowed_hours_end',
                'sla_callback_minutes',
            ]);
        });
        Schema::dropIfExists('call_events');
        Schema::table('calls', function (Blueprint $table): void {
            $table->dropColumn([
                'method',
                'state',
                'provider_call_id',
                'answered_at',
                'duration_source',
                'disconnect_reason',
                'correlation_id',
            ]);
        });
    }
};
