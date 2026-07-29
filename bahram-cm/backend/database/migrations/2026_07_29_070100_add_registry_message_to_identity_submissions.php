<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('identity_verification_submissions', function (Blueprint $table) {
            $table->text('registry_message')->nullable()->after('registry_checked_at');
        });
    }

    public function down(): void
    {
        Schema::table('identity_verification_submissions', function (Blueprint $table) {
            $table->dropColumn('registry_message');
        });
    }
};
