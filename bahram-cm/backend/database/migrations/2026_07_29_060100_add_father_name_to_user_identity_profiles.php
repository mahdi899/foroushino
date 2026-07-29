<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_identity_profiles', function (Blueprint $table) {
            $table->string('father_name')->nullable()->after('last_name');
        });
    }

    public function down(): void
    {
        Schema::table('user_identity_profiles', function (Blueprint $table) {
            $table->dropColumn('father_name');
        });
    }
};
