<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('telegram_destination_invite_links')) {
            return;
        }

        Schema::create('telegram_destination_invite_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('telegram_destination_id')
                ->constrained('telegram_destinations', indexName: 'tg_dest_inv_dest_fk')
                ->cascadeOnDelete();
            $table->foreignId('user_id')
                ->constrained('users', indexName: 'tg_dest_inv_user_fk')
                ->cascadeOnDelete();
            $table->foreignId('telegram_account_id')
                ->nullable()
                ->constrained('telegram_accounts', indexName: 'tg_dest_inv_account_fk')
                ->nullOnDelete();
            $table->unsignedBigInteger('telegram_user_id')->nullable();
            $table->string('invite_link', 500);
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->unique(['telegram_destination_id', 'user_id'], 'tg_dest_inv_dest_user_unique');
            $table->index(['telegram_destination_id', 'telegram_user_id'], 'tg_dest_inv_dest_tg_user_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_destination_invite_links');
    }
};
