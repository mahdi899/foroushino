<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('referral_cashback_enabled')->default(false)->after('sale_price');
            $table->string('referral_cashback_type', 16)->nullable()->after('referral_cashback_enabled');
            $table->unsignedInteger('referral_cashback_value')->nullable()->after('referral_cashback_type');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'referral_cashback_enabled',
                'referral_cashback_type',
                'referral_cashback_value',
            ]);
        });
    }
};
