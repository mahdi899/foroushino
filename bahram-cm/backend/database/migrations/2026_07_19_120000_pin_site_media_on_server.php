<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('media')
            ->where('path', 'like', 'media/site/%')
            ->update(['keep_on_server' => true]);
    }

    public function down(): void
    {
        // No-op: cannot know which rows were pinned only by this migration.
    }
};
