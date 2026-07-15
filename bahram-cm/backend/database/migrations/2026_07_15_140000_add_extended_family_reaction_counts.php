<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('family_post_stats', function (Blueprint $table) {
            $table->unsignedInteger('thumbs_up_count')->default(0)->after('clap_count');
            $table->unsignedInteger('laugh_count')->default(0)->after('thumbs_up_count');
            $table->unsignedInteger('sad_count')->default(0)->after('laugh_count');
            $table->unsignedInteger('party_count')->default(0)->after('sad_count');
            $table->unsignedInteger('star_count')->default(0)->after('party_count');
            $table->unsignedInteger('rocket_count')->default(0)->after('star_count');
            $table->unsignedInteger('eyes_count')->default(0)->after('rocket_count');
            $table->unsignedInteger('pray_count')->default(0)->after('eyes_count');
            $table->unsignedInteger('muscle_count')->default(0)->after('pray_count');
            $table->unsignedInteger('hundred_count')->default(0)->after('muscle_count');
            $table->unsignedInteger('wink_count')->default(0)->after('hundred_count');
        });
    }

    public function down(): void
    {
        Schema::table('family_post_stats', function (Blueprint $table) {
            $table->dropColumn([
                'thumbs_up_count',
                'laugh_count',
                'sad_count',
                'party_count',
                'star_count',
                'rocket_count',
                'eyes_count',
                'pray_count',
                'muscle_count',
                'hundred_count',
                'wink_count',
            ]);
        });
    }
};
