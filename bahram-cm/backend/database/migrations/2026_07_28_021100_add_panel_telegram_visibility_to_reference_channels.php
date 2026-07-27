<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reference_channels', function (Blueprint $table) {
            $table->boolean('show_in_panel')->default(true)->after('status');
            $table->boolean('show_in_telegram')->default(true)->after('show_in_panel');
        });
    }

    public function down(): void
    {
        Schema::table('reference_channels', function (Blueprint $table) {
            $table->dropColumn(['show_in_panel', 'show_in_telegram']);
        });
    }
};
