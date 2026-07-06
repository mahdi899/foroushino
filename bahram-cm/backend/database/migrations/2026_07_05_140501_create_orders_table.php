<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->string('customer_name');
            $table->string('customer_phone');
            $table->string('customer_email')->nullable();
            $table->string('customer_national_code')->nullable();
            $table->json('customer_extra_data')->nullable();
            $table->unsignedBigInteger('amount')->default(0);
            $table->unsignedBigInteger('discount_amount')->default(0);
            $table->unsignedBigInteger('final_amount')->default(0);
            $table->string('status')->default('pending_payment'); // pending_payment | paid | failed | canceled | delivered
            $table->string('payment_status')->default('pending'); // pending | paid | failed | canceled
            $table->string('spotplayer_license_code')->nullable();
            $table->timestamp('sms_sent_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'payment_status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
