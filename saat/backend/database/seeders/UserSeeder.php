<?php

namespace Database\Seeders;

use App\Enums\Availability;
use App\Enums\RoleName;
use App\Models\Team;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    private const AGENT_COUNT = 500;

    public function run(): void
    {
        $teams = Team::all();

        $admin = User::query()->firstOrCreate(
            ['email' => 'admin@saat.local'],
            [
                'name' => 'مدیر سیستم',
                'phone' => '09120000001',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'availability' => Availability::Offline,
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
            ]
        );
        $manager->syncRoles([RoleName::Manager->value]);

        foreach ($teams as $i => $team) {
            $leader = User::factory()->create([
                'name' => 'سرتیم '.$team->name,
                'email' => 'leader'.($i + 1).'@saat.local',
                'team_id' => $team->id,
                'availability' => Availability::Available,
            ]);
            $leader->syncRoles([RoleName::Leader->value]);

            $supervisor = User::factory()->create([
                'name' => 'ناظر '.$team->name,
                'email' => 'supervisor'.($i + 1).'@saat.local',
                'team_id' => $team->id,
                'availability' => Availability::Available,
            ]);
            $supervisor->syncRoles([RoleName::Supervisor->value]);

            $team->leader_id = $leader->id;
            $team->save();
        }

        $this->command?->getOutput()->writeln('Seeding '.self::AGENT_COUNT.' agents...');

        $agentRole = \Spatie\Permission\Models\Role::findByName(RoleName::Agent->value, 'web');
        $teamIds = $teams->pluck('id')->all();
        $teamCount = count($teamIds);
        $chunkSize = 100;
        $created = 0;

        while ($created < self::AGENT_COUNT) {
            $batchSize = min($chunkSize, self::AGENT_COUNT - $created);
            $agents = User::factory()->count($batchSize)->make()->map(function (User $agent, int $idx) use ($teamIds, $teamCount, $created) {
                $agent->team_id = $teamIds[($created + $idx) % $teamCount];
                $agent->availability = fake()->randomElement(['available', 'on_break', 'doing_follow_up', 'offline', 'offline']);

                return $agent;
            });

            $now = now()->format('Y-m-d H:i:s');
            $rows = $agents->map(fn (User $a) => [
                'name' => $a->name,
                'email' => $a->email,
                'phone' => $a->phone,
                'email_verified_at' => $now,
                'password' => $a->password,
                'team_id' => $a->team_id,
                'level' => $a->level,
                'points' => $a->points,
                'streak' => $a->streak,
                'call_goal' => $a->call_goal,
                'sale_goal' => $a->sale_goal,
                'availability' => $a->availability instanceof \BackedEnum ? $a->availability->value : $a->availability,
                'is_active' => $a->is_active,
                'created_at' => $now,
                'updated_at' => $now,
            ])->all();

            DB::table('users')->insert($rows);

            $insertedIds = User::query()->orderByDesc('id')->limit($batchSize)->pluck('id')->sort()->values();

            $roleRows = $insertedIds->map(fn ($id) => [
                'role_id' => $agentRole->id,
                'model_type' => User::class,
                'model_id' => $id,
            ])->all();
            DB::table('model_has_roles')->insert($roleRows);

            $walletRows = $insertedIds->map(fn ($id) => [
                'user_id' => $id,
                'balance_available' => 0,
                'balance_pending' => 0,
                'balance_locked' => 0,
                'total_earned' => 0,
                'total_paid' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ])->all();
            DB::table('wallets')->insert($walletRows);

            $created += $batchSize;
        }

        // Wallets for admin/manager/leaders/supervisors too.
        User::query()->role([RoleName::Admin->value, RoleName::Manager->value, RoleName::Leader->value, RoleName::Supervisor->value])
            ->get()
            ->each(fn (User $u) =>         Wallet::query()->firstOrCreate(['user_id' => $u->id]));

        $this->seedDemoAccounts($teams);
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
                ],
            );
            if ($user->call_goal !== 25) {
                $user->forceFill(['call_goal' => 25])->save();
            }
            $user->syncRoles([$roleMap[$account['role']]->value ?? RoleName::Agent->value]);
            Wallet::query()->firstOrCreate(['user_id' => $user->id]);
        }
    }
}
