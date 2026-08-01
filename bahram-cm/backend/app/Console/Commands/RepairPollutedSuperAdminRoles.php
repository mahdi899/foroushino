<?php

namespace App\Console\Commands;

use App\Enums\AdminRoleName;
use App\Models\User;
use Illuminate\Console\Command;
use Spatie\Permission\PermissionRegistrar;

/**
 * Removes accidental super-admin assignments left by older RolePermissionSeeder runs
 * that called assignRole() on every admin. Keeps admins who only have super-admin.
 */
class RepairPollutedSuperAdminRoles extends Command
{
    protected $signature = 'admins:repair-super-admin-roles
        {--dry-run : Show changes without writing to the database}';

    protected $description = 'Strip super-admin from admins who also have another role (seeder pollution cleanup)';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $repaired = 0;

        User::query()
            ->where('is_admin', true)
            ->orderBy('id')
            ->chunkById(100, function ($users) use ($dryRun, &$repaired): void {
                foreach ($users as $user) {
                    $roles = $user->getRoleNames()->values()->all();
                    if (! in_array(AdminRoleName::SuperAdmin->value, $roles, true) || count($roles) < 2) {
                        continue;
                    }

                    $kept = array_values(array_filter(
                        $roles,
                        fn (string $role) => $role !== AdminRoleName::SuperAdmin->value,
                    ));

                    $this->line(sprintf(
                        '%s %s (%s): super-admin + [%s] → [%s]',
                        $dryRun ? '[dry-run]' : '[repair]',
                        $user->name,
                        $user->email,
                        implode(', ', $roles),
                        implode(', ', $kept),
                    ));

                    if (! $dryRun) {
                        $user->syncRoles($kept);
                    }

                    $repaired++;
                }
            });

        if (! $dryRun && $repaired > 0) {
            app(PermissionRegistrar::class)->forgetCachedPermissions();
        }

        $this->info($dryRun
            ? "Dry run complete — {$repaired} admin(s) would be repaired."
            : "Repaired {$repaired} admin(s).");

        return self::SUCCESS;
    }
}
