<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('commissions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('sale_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('agent_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->decimal('sale_amount', 14, 2);
            $table->decimal('commission_rate', 5, 2);
            $table->decimal('commission_amount', 14, 2);
            $table->string('status', 20)->default('pending')->index();
            $table->timestamp('available_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();

            $table->index(['agent_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commissions');
    }
};
