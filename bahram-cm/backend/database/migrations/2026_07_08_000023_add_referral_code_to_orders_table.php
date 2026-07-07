<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Carries a captured `?ref=` referral code from checkout through to
     * fulfillment. The actual referral_conversions row is only ever created
     * after a verified payment — this column is just a hint, not a reward.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('referral_code', 20)->nullable()->after('customer_extra_data');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('referral_code');
        });
    }
};
