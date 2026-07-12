<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sat_leads', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone', 20);
            $table->string('email')->nullable();
            $table->string('source')->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('new');
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedBigInteger('marketing_lead_id')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['assigned_to', 'status']);
            $table->index('phone');
        });

        Schema::create('sat_calls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sat_lead_id')->constrained('sat_leads')->cascadeOnDelete();
            $table->foreignId('staff_id')->constrained('users')->cascadeOnDelete();
            $table->string('direction')->default('outbound');
            $table->string('outcome')->nullable();
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->text('notes')->nullable();
            $table->string('review_status')->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_notes')->nullable();
            $table->timestamp('called_at');
            $table->timestamps();

            $table->index(['staff_id', 'review_status']);
        });

        Schema::create('sat_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sat_lead_id')->constrained('sat_leads')->cascadeOnDelete();
            $table->foreignId('staff_id')->constrained('users')->cascadeOnDelete();
            $table->string('type');
            $table->text('description')->nullable();
            $table->string('status')->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_notes')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['staff_id', 'status']);
        });

        Schema::create('sat_deposits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sat_lead_id')->nullable()->constrained('sat_leads')->nullOnDelete();
            $table->foreignId('staff_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedBigInteger('amount');
            $table->string('currency', 8)->default('IRT');
            $table->string('reference')->nullable();
            $table->string('status')->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('sat_withdrawals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedBigInteger('amount');
            $table->string('currency', 8)->default('IRT');
            $table->string('status')->default('pending');
            $table->text('card_last4')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sat_withdrawals');
        Schema::dropIfExists('sat_deposits');
        Schema::dropIfExists('sat_activities');
        Schema::dropIfExists('sat_calls');
        Schema::dropIfExists('sat_leads');
    }
};
