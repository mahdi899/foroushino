<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chatbot_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('is_enabled')->default(false);
            $table->string('bot_name')->default('دستیار بهرام');
            $table->text('welcome_message')->nullable();
            $table->text('system_prompt')->nullable();
            $table->text('response_structure')->nullable();
            $table->text('fallback_message')->nullable();
            $table->boolean('collect_name_enabled')->default(true);
            $table->boolean('collect_phone_enabled')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chatbot_settings');
    }
};
