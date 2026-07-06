<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('performance_snapshots', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date')->index();
            $table->unsignedInteger('calls_count')->default(0);
            $table->unsignedInteger('successful_count')->default(0);
            $table->decimal('conversion_rate', 5, 2)->default(0);
            $table->unsignedInteger('avg_talk_sec')->default(0);
            $table->decimal('note_quality', 5, 2)->default(0);
            $table->unsignedInteger('hot_leads')->default(0);
            $table->unsignedInteger('overdue_followups')->default(0);
            $table->unsignedInteger('confirmed_sales')->default(0);
            $table->decimal('approved_commission', 14, 2)->default(0);
            $table->decimal('score', 6, 2)->default(0);
            $table->timestamps();

            $table->unique(['user_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('performance_snapshots');
    }
};
