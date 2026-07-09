<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payout_requests', function (Blueprint $table): void {
            $table->decimal('bank_fee', 14, 2)->default(0)->after('amount');
            $table->decimal('net_amount', 14, 2)->nullable()->after('bank_fee');
        });
    }

    public function down(): void
    {
        Schema::table('payout_requests', function (Blueprint $table): void {
            $table->dropColumn(['bank_fee', 'net_amount']);
        });
    }
};
