<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seminar_assets', function (Blueprint $table) {
            $table->string('path')->nullable()->change();
            $table->string('external_url', 2048)->nullable()->after('path');
        });
    }

    public function down(): void
    {
        Schema::table('seminar_assets', function (Blueprint $table) {
            $table->dropColumn('external_url');
            $table->string('path')->nullable(false)->change();
        });
    }
};
