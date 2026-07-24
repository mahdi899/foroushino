<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('push_subscriptions', function (Blueprint $table) {
            $table->string('channel', 32)->default('family')->after('user_id');
            $table->timestamp('last_notified_at')->nullable()->after('user_agent');
        });

        // Deduplicate endpoints before unique index (keep newest).
        $dupes = DB::table('push_subscriptions')
            ->select('endpoint')
            ->groupBy('endpoint')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('endpoint');

        foreach ($dupes as $endpoint) {
            $ids = DB::table('push_subscriptions')
                ->where('endpoint', $endpoint)
                ->orderByDesc('id')
                ->pluck('id');
            $keep = $ids->shift();
            if ($ids->isNotEmpty()) {
                DB::table('push_subscriptions')->whereIn('id', $ids)->delete();
            }
            unset($keep);
        }

        Schema::table('push_subscriptions', function (Blueprint $table) {
            $table->unique('endpoint');
            $table->index(['channel', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::table('push_subscriptions', function (Blueprint $table) {
            $table->dropUnique(['endpoint']);
            $table->dropIndex(['channel', 'user_id']);
            $table->dropColumn(['channel', 'last_notified_at']);
        });
    }
};
