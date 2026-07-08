<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sms_event_configs', function (Blueprint $table) {
            $table->id();
            $table->string('event_key')->unique();
            $table->string('label_fa');
            $table->string('description')->nullable();
            $table->boolean('is_enabled')->default(true);
            $table->text('message_template')->nullable();
            $table->string('pattern_code')->nullable();
            $table->boolean('use_pattern')->default(false);
            $table->string('provider_slug')->nullable();
            $table->boolean('fallback_enabled')->default(false);
            $table->unsignedSmallInteger('fallback_delay_seconds')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sms_event_configs');
    }
};
