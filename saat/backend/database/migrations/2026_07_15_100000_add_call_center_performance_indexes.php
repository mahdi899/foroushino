<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table): void {
            $table->index(['assigned_agent_id', 'status', 'locked_until'], 'leads_agent_status_lock_idx');
            $table->index(['assigned_team_id', 'status', 'returned_to_pool'], 'leads_team_status_pool_idx');
            $table->index(['status', 'do_not_call_at', 'locked_until'], 'leads_status_dnc_lock_idx');
        });

        Schema::table('calls', function (Blueprint $table): void {
            $table->index(['lead_id', 'created_at'], 'calls_lead_created_idx');
            $table->index(['agent_id', 'ended_at'], 'calls_agent_ended_idx');
            $table->index(['agent_id', 'created_at'], 'calls_agent_created_idx');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->index(['team_id', 'is_active'], 'users_team_active_idx');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropIndex('users_team_active_idx');
        });

        Schema::table('calls', function (Blueprint $table): void {
            $table->dropIndex('calls_lead_created_idx');
            $table->dropIndex('calls_agent_ended_idx');
            $table->dropIndex('calls_agent_created_idx');
        });

        Schema::table('leads', function (Blueprint $table): void {
            $table->dropIndex('leads_agent_status_lock_idx');
            $table->dropIndex('leads_team_status_pool_idx');
            $table->dropIndex('leads_status_dnc_lock_idx');
        });
    }
};
