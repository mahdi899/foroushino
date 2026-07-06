<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->string('gateway')->default('zarinpal');
            $table->string('authority')->nullable()->index();
            $table->string('ref_id')->nullable();
            $table->unsignedBigInteger('amount');
            $table->string('status')->default('pending'); // pending | paid | failed | canceled
            $table->json('request_payload')->nullable();
            $table->json('verify_payload')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
