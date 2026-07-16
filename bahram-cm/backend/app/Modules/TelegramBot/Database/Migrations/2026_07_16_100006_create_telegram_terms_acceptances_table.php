<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('telegram_terms_acceptances')) {
            return;
        }

        Schema::create('telegram_terms_acceptances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('telegram_account_id')->constrained('telegram_accounts')->cascadeOnDelete();
            $table->foreignId('telegram_legal_document_id')->constrained('telegram_legal_documents')->cascadeOnDelete();
            $table->timestamp('accepted_at');
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();

            $table->unique(['telegram_account_id', 'telegram_legal_document_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_terms_acceptances');
    }
};
