<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('push_subscriptions', 'channel')) {
            Schema::table('push_subscriptions', function (Blueprint $table) {
                $table->string('channel', 32)->default('family')->after('user_id');
            });
        }

        if (! Schema::hasColumn('push_subscriptions', 'last_notified_at')) {
            Schema::table('push_subscriptions', function (Blueprint $table) {
                $table->timestamp('last_notified_at')->nullable()->after('user_agent');
            });
        }

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

        if (! $this->indexExists('push_subscriptions', 'push_subscriptions_endpoint_unique')) {
            Schema::table('push_subscriptions', function (Blueprint $table) {
                $table->unique('endpoint');
            });
        }

        if (! $this->indexExists('push_subscriptions', 'push_subscriptions_channel_user_id_index')) {
            Schema::table('push_subscriptions', function (Blueprint $table) {
                $table->index(['channel', 'user_id']);
            });
        }
    }

    private function indexExists(string $table, string $indexName): bool
    {
        if (DB::getDriverName() === 'sqlite') {
            $rows = DB::select("PRAGMA index_list('{$table}')");

            foreach ($rows as $row) {
                if (($row->name ?? null) === $indexName) {
                    return true;
                }
            }

            return false;
        }

        $rows = DB::select('SHOW INDEX FROM `'.$table.'` WHERE Key_name = ?', [$indexName]);

        return count($rows) > 0;
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
