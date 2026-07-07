<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Adds mobile-first identity fields needed by the Student Academy Portal.
     * `mobile` becomes the student's primary identifier; `email`/`password`
     * become optional so mobile+OTP accounts can exist without them.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('mobile', 20)->nullable()->unique()->after('name');
            $table->string('status')->default('active')->after('is_admin');
            $table->timestamp('mobile_verified_at')->nullable()->after('email_verified_at');
            $table->timestamp('first_login_at')->nullable()->after('status');
            $table->timestamp('last_login_at')->nullable()->after('first_login_at');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('email')->nullable()->change();
            $table->string('password')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['mobile', 'status', 'mobile_verified_at', 'first_login_at', 'last_login_at']);
        });
    }
};
