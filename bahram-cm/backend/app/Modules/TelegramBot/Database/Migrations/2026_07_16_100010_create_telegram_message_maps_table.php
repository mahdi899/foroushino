<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('telegram_message_maps')) {
            return;
        }

        Schema::create('telegram_message_maps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained('tickets')->cascadeOnDelete();
            $table->string('direction', 16);
            $table->string('source_chat_id');
            $table->unsignedBigInteger('source_message_id');
            $table->string('target_chat_id');
            $table->unsignedBigInteger('target_message_id');
            $table->unsignedBigInteger('target_thread_id')->nullable();
            $table->string('media_group_id')->nullable();
            $table->unsignedInteger('edit_version')->default(0);
            $table->timestamp('edited_at')->nullable();
            $table->timestamps();

            $table->index(['source_chat_id', 'source_message_id']);
            $table->index(['target_chat_id', 'target_message_id']);
            $table->index(['ticket_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_message_maps');
    }
};
