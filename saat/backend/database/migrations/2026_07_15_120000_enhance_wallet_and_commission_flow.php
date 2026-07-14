<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('bank_card', 19)->nullable()->after('phone');
            $table->timestamp('bank_card_confirmed_at')->nullable()->after('bank_card');
        });

        Schema::table('commissions', function (Blueprint $table): void {
            $table->foreignId('leader_approved_by')->nullable()->after('approved_at')->constrained('users')->nullOnDelete();
            $table->timestamp('leader_approved_at')->nullable()->after('leader_approved_by');
        });

        Schema::table('payout_requests', function (Blueprint $table): void {
            $table->string('bank_card', 19)->nullable()->after('net_amount');
        });
    }

    public function down(): void
    {
        Schema::table('payout_requests', function (Blueprint $table): void {
            $table->dropColumn('bank_card');
        });

        Schema::table('commissions', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('leader_approved_by');
            $table->dropColumn('leader_approved_at');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['bank_card', 'bank_card_confirmed_at']);
        });
    }
};
