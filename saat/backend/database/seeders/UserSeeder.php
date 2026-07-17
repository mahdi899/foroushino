<?php

namespace Database\Seeders;

use App\Enums\Availability;
use App\Enums\RoleName;
use App\Models\Team;
use App\Models\User;
use App\Models\Wallet;
use App\Support\TeamCapacity;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $teams = Team::all();
        $agentsPerTeam = TeamCapacity::AGENTS_PER_TEAM;

        $admin = User::query()->firstOrCreate(
            ['email' => 'admin@saat.local'],
            [
                'name' => 'مدیر سیستم',
                'phone' => '09120000001',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'availability' => Availability::Offline,
                'is_active' => true,
            ]
        );
        $admin->syncRoles([RoleName::Manager->value]);

        $manager = User::query()->firstOrCreate(
            ['email' => 'manager@saat.local'],
            [
                'name' => 'مدیر فروش فروشینو',
                'phone' => '09120000002',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'availability' => Availability::Available,
                'is_active' => true,
            ]
        );
        $manager->syncRoles([RoleName::Manager->value]);

        foreach ($teams as $i => $team) {
            $teamNum = $i + 1;

            $leader = User::query()->firstOrCreate(
                ['email' => "leader{$teamNum}@saat.local"],
                [
                    'name' => 'سرتیم '.$team->name,
                    'phone' => sprintf('0912100%04d', $teamNum),
                    'password' => Hash::make('password'),
                    'email_verified_at' => now(),
                    'team_id' => $team->id,
                    'availability' => Availability::Available,
                    'is_active' => true,
                ]
            );
            $leader->syncRoles([RoleName::Leader->value]);
            if ((int) $leader->team_id !== (int) $team->id) {
                $leader->forceFill(['team_id' => $team->id, 'is_active' => true])->save();
            }

            $supervisor = User::query()->firstOrCreate(
                ['email' => "supervisor{$teamNum}@saat.local"],
                [
                    'name' => 'ناظر '.$team->name,
                    'phone' => sprintf('0912200%04d', $teamNum),
                    'password' => Hash::make('password'),
                    'email_verified_at' => now(),
                    'team_id' => $team->id,
                    'availability' => Availability::Available,
                    'is_active' => true,
                ]
            );
            $supervisor->syncRoles([RoleName::Supervisor->value]);
            if ((int) $supervisor->team_id !== (int) $team->id) {
                $supervisor->forceFill(['team_id' => $team->id, 'is_active' => true])->save();
            }

            $team->leader_id = $leader->id;
            $team->supervisor_id = $supervisor->id;
            $team->save();

            $this->seedAgentsForTeam($team, $teamNum, $agentsPerTeam);
            TeamCapacity::enforceForTeam($team->id);
        }

        User::query()
            ->role([RoleName::Admin->value, RoleName::Manager->value, RoleName::Leader->value, RoleName::Supervisor->value])
            ->get()
            ->each(fn (User $user) => Wallet::query()->firstOrCreate(['user_id' => $user->id]));

        $this->seedDemoAccounts($teams);

        $totalAgents = $teams->count() * $agentsPerTeam;
        $this->command?->getOutput()->writeln("Teams seeded with up to {$agentsPerTeam} active agents each ({$totalAgents} total capacity).");
    }

    private function seedAgentsForTeam(Team $team, int $teamNum, int $agentsPerTeam): void
    {
        $availabilities = [
            Availability::Available,
            Availability::OnBreak,
            Availability::DoingFollowUp,
            Availability::Offline,
        ];

        for ($slot = 1; $slot <= $agentsPerTeam; $slot++) {
            $email = "agent{$teamNum}-{$slot}@saat.local";

            $agent = User::query()->firstOrCreate(
                ['email' => $email],
                [
                    'name' => fake()->name(),
                    'phone' => sprintf('0913%02d%02d', $teamNum, $slot),
                    'password' => Hash::make('password'),
                    'email_verified_at' => now(),
                    'team_id' => $team->id,
                    'level' => fake()->numberBetween(1, 6),
                    'points' => fake()->numberBetween(0, 4000),
                    'streak' => fake()->numberBetween(0, 20),
                    'call_goal' => 25,
                    'sale_goal' => fake()->numberBetween(2, 6),
                    'availability' => fake()->randomElement($availabilities),
                    'is_active' => true,
                ]
            );

            $agent->syncRoles([RoleName::Agent->value]);

            if ((int) $agent->team_id !== (int) $team->id || ! $agent->is_active) {
                $agent->forceFill(['team_id' => $team->id, 'is_active' => true])->save();
            }

            Wallet::query()->firstOrCreate(['user_id' => $agent->id]);
        }
    }

    private function seedDemoAccounts($teams): void
    {
        if (! config('demo_auth.enabled', false)) {
            return;
        }

        $teamId = $teams->first()?->id;
        $roleMap = [
            'agent' => RoleName::Agent,
            'leader' => RoleName::Leader,
            'supervisor' => RoleName::Supervisor,
            'manager' => RoleName::Manager,
            'admin' => RoleName::Manager,
        ];

        foreach (config('demo_auth.accounts', []) as $phone => $account) {
            $user = User::query()->firstOrCreate(
                ['phone' => $phone],
                [
                    'name' => $account['name'],
                    'email' => $account['email'],
                    'password' => Hash::make('password'),
                    'email_verified_at' => now(),
                    'team_id' => in_array($account['role'], ['agent', 'leader', 'supervisor'], true) ? $teamId : null,
                    'availability' => Availability::Available,
                    'call_goal' => 25,
                    'is_active' => true,
                ]
            );
            $updates = [];
            if ($user->call_goal !== 25) {
                $updates['call_goal'] = 25;
            }
            if (
                $teamId
                && in_array($account['role'], ['agent', 'leader', 'supervisor'], true)
                && (int) $user->team_id !== (int) $teamId
            ) {
                $updates['team_id'] = $teamId;
            }
            if ($updates !== []) {
                $user->forceFill($updates)->save();
            }
            $user->syncRoles([$roleMap[$account['role']]->value ?? RoleName::Agent->value]);
            Wallet::query()->firstOrCreate(['user_id' => $user->id]);

            if ($user->hasRole(RoleName::Agent->value) && $teamId) {
                TeamCapacity::enforceForTeam((int) $teamId);
            }
        }
    }
}
