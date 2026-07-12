<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_sat_staff')->default(false)->after('is_admin');
            $table->foreignId('sat_leader_id')
                ->nullable()
                ->after('is_sat_staff')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('sat_leader_id');
            $table->dropColumn('is_sat_staff');
        });
    }
};
