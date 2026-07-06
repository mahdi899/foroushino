<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('follow_ups', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->foreignId('agent_id')->constrained('users')->cascadeOnDelete();
            $table->string('kind', 20)->default('call');
            $table->string('title');
            $table->timestamp('due_at')->index();
            $table->string('status', 20)->default('pending')->index();
            $table->unsignedTinyInteger('priority')->default(1);
            $table->text('note')->nullable();
            $table->foreignId('created_from_call_id')->nullable()->constrained('calls')->nullOnDelete();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['agent_id', 'status', 'due_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('follow_ups');
    }
};
