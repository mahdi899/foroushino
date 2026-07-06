<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_settings', function (Blueprint $table) {
            $table->id();
            $table->string('provider_name')->default('OpenAI-compatible');
            $table->text('api_key')->nullable(); // encrypted
            $table->string('base_url')->nullable();
            $table->string('model')->default('gpt-4o-mini');
            $table->float('temperature')->default(0.7);
            $table->unsignedInteger('max_tokens')->default(2000);
            $table->boolean('is_active')->default(false);
            $table->text('system_default_prompt')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_settings');
    }
};
