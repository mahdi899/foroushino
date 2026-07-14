<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->where('call_goal', 40)->update(['call_goal' => 25]);

        DB::table('daily_targets')
            ->where('call_goal', 40)
            ->whereDate('date', today())
            ->update(['call_goal' => 25]);
    }

    public function down(): void
    {
        DB::table('users')->where('call_goal', 25)->update(['call_goal' => 40]);

        DB::table('daily_targets')
            ->where('call_goal', 25)
            ->whereDate('date', today())
            ->update(['call_goal' => 40]);
    }
};
