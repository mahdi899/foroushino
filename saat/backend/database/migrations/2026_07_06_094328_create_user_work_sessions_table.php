<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_work_sessions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->unsignedInteger('total_break_seconds')->default(0);
            $table->unsignedInteger('total_call_seconds')->default(0);
            $table->timestamps();

            $table->index(['user_id', 'started_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_work_sessions');
    }
};
