<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('referral_code', 8)->nullable()->unique()->after('phone');
        });

        User::query()
            ->whereNull('referral_code')
            ->eachById(function (User $user): void {
                $user->forceFill(['referral_code' => User::generateUniqueReferralCode()])->save();
            });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('referral_code');
        });
    }
};
