<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Card numbers are never stored raw. `card_number_encrypted` is decrypted
     * on demand for authorized admins only; students always see the masked
     * `card_last4` form.
     */
    public function up(): void
    {
        Schema::create('cashback_payouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedBigInteger('amount');
            $table->text('card_number_encrypted')->nullable();
            $table->string('card_last4', 4)->nullable();
            $table->string('card_holder_name')->nullable();
            $table->string('status')->default('pending');
            $table->text('admin_note')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cashback_payouts');
    }
};
