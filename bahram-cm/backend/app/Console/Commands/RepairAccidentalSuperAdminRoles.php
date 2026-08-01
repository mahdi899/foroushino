<?php

namespace App\Console\Commands;

use App\Enums\AdminRoleName;
use App\Models\User;
use Illuminate\Console\Command;
use Spatie\Permission\PermissionRegistrar;

/**
 * Repair the RolePermissionSeeder bug that assigned super-admin on top of
 * every existing admin role (users ended up with e.g. finance + super-admin).
 *
 * Removes the super-admin role when the user also has at least one other role.
 * Root admins and users who only have super-admin are left untouched.
 */
class RepairAccidentalSuperAdminRoles extends Command
{
    protected $signature = 'roles:repair-extra-super-admin
        {--dry-run : List affected users without changing anything}
        {--force : Apply without confirmation}';

    protected $description = 'Strip accidental super-admin role from admins who already have another role';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $super = AdminRoleName::SuperAdmin->value;

        $affected = User::query()
            ->where('is_admin', true)
            ->where('is_root_admin', false)
            ->role($super)
            ->with('roles')
            ->orderBy('id')
            ->get()
            ->filter(fn (User $user) => $user->roles->count() > 1);

        if ($affected->isEmpty()) {
            $this->info('No admins with super-admin plus another role.');

            return self::SUCCESS;
        }

        $this->table(
            ['id', 'email', 'roles'],
            $affected->map(fn (User $u) => [
                $u->id,
                $u->email,
                $u->getRoleNames()->implode(', '),
            ])->all(),
        );

        if ($dryRun) {
            $this->warn('Dry-run only — no changes. Re-run without --dry-run to apply.');

            return self::SUCCESS;
        }

        if (! $this->option('force') && ! $this->confirm('Remove super-admin from these '.$affected->count().' user(s)?')) {
            return self::FAILURE;
        }

        foreach ($affected as $user) {
            $user->removeRole($super);
            $this->line("Fixed #{$user->id} {$user->email} → ".$user->fresh()->getRoleNames()->implode(', '));
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->info('Done. Permission cache cleared.');

        return self::SUCCESS;
    }
}
