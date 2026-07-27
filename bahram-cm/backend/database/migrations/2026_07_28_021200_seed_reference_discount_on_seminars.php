<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Ensure seminar → reference-channel discount yields 200k when list price is 30M.
 * Only fills rows still at the default 0 so admin overrides are preserved.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('seminars')
            ->where('reference_discount_amount', 0)
            ->update(['reference_discount_amount' => 29_800_000]);
    }

    public function down(): void
    {
        DB::table('seminars')
            ->where('reference_discount_amount', 29_800_000)
            ->update(['reference_discount_amount' => 0]);
    }
};
