<?php

use Database\Seeders\RolePermissionSeeder;
use Illuminate\Database\Migrations\Migration;

/**
 * Tech ticket escalation roles (tech-support / tech-manager) were added to
 * AdminRoleName + RolePermissionSeeder after production was already live.
 * Deploy only runs migrations, not RolePermissionSeeder — so those roles never
 * appeared in the admin role checkbox panel.
 *
 * RolePermissionSeeder is idempotent: creates missing system roles/permissions
 * and syncs the canonical permission matrix. It does not change which roles
 * are assigned to existing admins (except zero-role orphan admins).
 */
return new class extends Migration
{
    public function up(): void
    {
        (new RolePermissionSeeder)->run();
    }

    public function down(): void
    {
        // Keep roles; removing them would break admins already assigned.
    }
};
