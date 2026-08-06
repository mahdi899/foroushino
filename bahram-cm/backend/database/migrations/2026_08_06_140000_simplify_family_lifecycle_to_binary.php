<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Collapse family lifecycle to binary active / inactive.
 *
 * Mapping:
 * - forming, cooling → active (still operational; membership intake stays on accepting_members)
 * - dormant → inactive
 * - active → active
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('families')
            ->whereIn('lifecycle', ['forming', 'cooling'])
            ->update(['lifecycle' => 'active']);

        DB::table('families')
            ->where('lifecycle', 'dormant')
            ->update(['lifecycle' => 'inactive']);

        Schema::table('families', function (Blueprint $table) {
            $table->string('lifecycle')->default('active')->change();
        });
    }

    public function down(): void
    {
        // Irreversible for dormant→inactive; restore forming as previous default only.
        Schema::table('families', function (Blueprint $table) {
            $table->string('lifecycle')->default('forming')->change();
        });
    }
};
