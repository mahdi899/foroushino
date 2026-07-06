<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calls', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->foreignId('agent_id')->constrained('users')->cascadeOnDelete();
            $table->string('result', 30)->nullable();
            $table->text('note')->nullable();
            $table->unsignedInteger('duration_sec')->default(0);
            $table->string('objection', 30)->nullable();
            $table->string('next_stage', 20)->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->string('idempotency_key')->nullable()->unique();
            $table->timestamps();

            $table->index(['agent_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calls');
    }
};
