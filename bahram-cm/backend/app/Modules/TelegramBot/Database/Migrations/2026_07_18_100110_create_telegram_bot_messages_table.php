<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('telegram_bot_messages')) {
            return;
        }

        Schema::create('telegram_bot_messages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('telegram_bot_id')->constrained('telegram_bots')->cascadeOnDelete();
            $table->string('message_key', 120);
            $table->text('body');
            $table->string('label_fa', 160)->nullable();
            $table->string('category', 80)->nullable();
            $table->timestamps();

            $table->unique(['telegram_bot_id', 'message_key']);
            $table->index(['category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_bot_messages');
    }
};
