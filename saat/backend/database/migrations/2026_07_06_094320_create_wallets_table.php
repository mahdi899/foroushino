<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallets', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->decimal('balance_available', 14, 2)->default(0);
            $table->decimal('balance_pending', 14, 2)->default(0);
            $table->decimal('balance_locked', 14, 2)->default(0);
            $table->decimal('total_earned', 14, 2)->default(0);
            $table->decimal('total_paid', 14, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallets');
    }
};
