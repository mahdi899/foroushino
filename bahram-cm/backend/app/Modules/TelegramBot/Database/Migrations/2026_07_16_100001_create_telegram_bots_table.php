<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('telegram_bots')) {
            return;
        }

        Schema::create('telegram_bots', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('display_name');
            $table->string('username')->nullable();
            $table->string('token_key');
            $table->string('webhook_secret')->nullable();
            $table->string('environment')->default('production');
            $table->boolean('is_active')->default(true);
            $table->string('support_group_chat_id')->nullable();
            $table->string('reports_chat_id')->nullable();
            $table->string('reports_topic_id')->nullable();
            $table->json('settings')->nullable();
            $table->timestamps();

            $table->index(['is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_bots');
    }
};
