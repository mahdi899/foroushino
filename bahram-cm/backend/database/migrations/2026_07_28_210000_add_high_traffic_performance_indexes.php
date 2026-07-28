<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Hot-path indexes for high concurrency (orders, access checks, tickets, telegram).
 * Idempotent: skips indexes that already exist.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->addIndex('orders', 'orders_user_status_idx', ['user_id', 'status']);
        $this->addIndex('orders', 'orders_created_at_idx', ['created_at']);

        $this->addIndex('course_accesses', 'course_accesses_user_status_idx', ['user_id', 'status']);

        $this->addIndex('tickets', 'tickets_user_status_idx', ['user_id', 'status']);
        $this->addIndex('tickets', 'tickets_status_id_idx', ['status', 'id']);

        $this->addIndex('payments', 'payments_status_created_idx', ['status', 'created_at']);

        $this->addIndex('telegram_updates', 'telegram_updates_bot_status_idx', ['telegram_bot_id', 'status']);

        $this->addIndex('telegram_accounts', 'telegram_accounts_bot_blocked_idx', ['telegram_bot_id', 'is_blocked']);
        if (Schema::hasTable('telegram_accounts') && Schema::hasColumn('telegram_accounts', 'is_bot_admin')) {
            $this->addIndex('telegram_accounts', 'telegram_accounts_bot_admin_idx', ['telegram_bot_id', 'is_bot_admin']);
        }

        $this->addIndex(
            'telegram_message_maps',
            'tg_msg_maps_dir_target_idx',
            ['direction', 'target_chat_id', 'target_message_id']
        );
        $this->addIndex('telegram_message_maps', 'tg_msg_maps_dir_ticket_idx', ['direction', 'ticket_id']);
        $this->addIndex('telegram_message_maps', 'tg_msg_maps_media_group_idx', ['media_group_id']);

        if (Schema::hasTable('telegram_broadcast_recipients')) {
            $this->addIndex(
                'telegram_broadcast_recipients',
                'tg_bcast_recip_batch_status_idx',
                ['batch_id', 'status']
            );
        }

        if (Schema::hasTable('sat_applications')) {
            $this->addIndex('sat_applications', 'sat_applications_user_status_idx', ['user_id', 'status']);
        }
    }

    public function down(): void
    {
        $this->dropIndex('orders', 'orders_user_status_idx');
        $this->dropIndex('orders', 'orders_created_at_idx');
        $this->dropIndex('course_accesses', 'course_accesses_user_status_idx');
        $this->dropIndex('tickets', 'tickets_user_status_idx');
        $this->dropIndex('tickets', 'tickets_status_id_idx');
        $this->dropIndex('payments', 'payments_status_created_idx');
        $this->dropIndex('telegram_updates', 'telegram_updates_bot_status_idx');
        $this->dropIndex('telegram_accounts', 'telegram_accounts_bot_blocked_idx');
        $this->dropIndex('telegram_accounts', 'telegram_accounts_bot_admin_idx');
        $this->dropIndex('telegram_message_maps', 'tg_msg_maps_dir_target_idx');
        $this->dropIndex('telegram_message_maps', 'tg_msg_maps_dir_ticket_idx');
        $this->dropIndex('telegram_message_maps', 'tg_msg_maps_media_group_idx');
        $this->dropIndex('telegram_broadcast_recipients', 'tg_bcast_recip_batch_status_idx');
        $this->dropIndex('sat_applications', 'sat_applications_user_status_idx');
    }

    /**
     * @param  list<string>  $columns
     */
    private function addIndex(string $table, string $name, array $columns): void
    {
        if (! Schema::hasTable($table)) {
            return;
        }

        if (Schema::hasIndex($table, $name)) {
            return;
        }

        Schema::table($table, function (Blueprint $blueprint) use ($name, $columns): void {
            $blueprint->index($columns, $name);
        });
    }

    private function dropIndex(string $table, string $name): void
    {
        if (! Schema::hasTable($table) || ! Schema::hasIndex($table, $name)) {
            return;
        }

        Schema::table($table, function (Blueprint $blueprint) use ($name): void {
            $blueprint->dropIndex($name);
        });
    }
};
