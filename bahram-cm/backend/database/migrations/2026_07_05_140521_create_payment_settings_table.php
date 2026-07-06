<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_settings', function (Blueprint $table) {
            $table->id();
            $table->text('zarinpal_merchant_id')->nullable(); // encrypted
            $table->boolean('sandbox_mode')->default(true);
            $table->string('callback_url')->nullable();
            $table->boolean('is_active')->default(false);
            $table->string('currency')->default('IRT'); // IRT | IRR
            $table->text('description_template')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_settings');
    }
};
