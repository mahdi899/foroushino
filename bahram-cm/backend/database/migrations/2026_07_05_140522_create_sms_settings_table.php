<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sms_settings', function (Blueprint $table) {
            $table->id();
            $table->string('sms_provider')->default('kavenegar');
            $table->text('sms_api_key')->nullable(); // encrypted
            $table->string('sms_sender_number')->nullable();
            $table->string('sms_pattern_code')->nullable();
            $table->boolean('is_sms_active')->default(false);
            $table->string('test_phone')->nullable();
            $table->text('purchase_message_template')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sms_settings');
    }
};
