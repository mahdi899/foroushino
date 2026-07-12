<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('verified_bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('card_number_encrypted')->nullable();
            $table->char('card_last4', 4)->nullable();
            $table->text('iban_encrypted')->nullable();
            $table->char('iban_last4', 4)->nullable();
            $table->string('bank_name')->nullable();
            $table->string('holder_name')->nullable();
            $table->unsignedInteger('verification_fee')->default(0);
            $table->string('provider')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'verified_at']);
        });

        Schema::table('cashback_payouts', function (Blueprint $table) {
            $table->foreignId('verified_bank_account_id')
                ->nullable()
                ->after('user_id')
                ->constrained('verified_bank_accounts')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('cashback_payouts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('verified_bank_account_id');
        });

        Schema::dropIfExists('verified_bank_accounts');
    }
};
