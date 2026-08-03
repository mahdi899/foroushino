<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('telegram_destination_mobile_merges')) {
            return;
        }

        Schema::create('telegram_destination_mobile_merges', function (Blueprint $table) {
            $table->id();
            $table->string('canonical_mobile', 20);
            $table->string('telegram_mobile', 20);
            $table->foreignId('canonical_user_id')
                ->constrained('users', indexName: 'tg_dest_merge_user_fk')
                ->cascadeOnDelete();
            $table->foreignId('telegram_account_id')
                ->nullable()
                ->constrained('telegram_accounts', indexName: 'tg_dest_merge_account_fk')
                ->nullOnDelete();
            $table->string('status', 16)->default('pending');
            $table->text('note')->nullable();
            $table->foreignId('approved_by')
                ->nullable()
                ->constrained('users', indexName: 'tg_dest_merge_approved_fk')
                ->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('revoked_by')
                ->nullable()
                ->constrained('users', indexName: 'tg_dest_merge_revoked_fk')
                ->nullOnDelete();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at'], 'tg_dest_merge_status_created');
            $table->index('canonical_mobile', 'tg_dest_merge_canonical_idx');
            $table->index('telegram_mobile', 'tg_dest_merge_telegram_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_destination_mobile_merges');
    }
};
