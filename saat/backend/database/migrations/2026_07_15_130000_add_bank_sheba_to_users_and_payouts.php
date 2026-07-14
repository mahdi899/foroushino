<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('bank_sheba', 26)->nullable()->after('bank_card_confirmed_at');
        });

        Schema::table('payout_requests', function (Blueprint $table): void {
            $table->string('bank_sheba', 26)->nullable()->after('bank_card');
        });
    }

    public function down(): void
    {
        Schema::table('payout_requests', function (Blueprint $table): void {
            $table->dropColumn('bank_sheba');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('bank_sheba');
        });
    }
};
