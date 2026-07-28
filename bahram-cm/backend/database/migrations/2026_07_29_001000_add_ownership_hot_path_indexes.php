<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ownership hot-path indexes for product/seminar purchase checks.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->addIndex('orders', 'orders_product_status_idx', ['product_id', 'status']);

        if (Schema::hasTable('seminar_attendees')) {
            $this->addIndex(
                'seminar_attendees',
                'seminar_attendees_seminar_status_idx',
                ['seminar_id', 'attendance_status']
            );
        }
    }

    public function down(): void
    {
        $this->dropIndex('orders', 'orders_product_status_idx');
        $this->dropIndex('seminar_attendees', 'seminar_attendees_seminar_status_idx');
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
