<?php

namespace Tests\Feature;

use App\Models\Team;
use App\Models\User;
use App\Support\TeamCapacity;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\TeamSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeamCapacityTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_seeder_creates_fifteen_active_agents_per_team(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $this->seed(TeamSeeder::class);
        $this->seed(UserSeeder::class);

        foreach (Team::query()->pluck('id') as $teamId) {
            $this->assertSame(
                TeamCapacity::AGENTS_PER_TEAM,
                TeamCapacity::activeAgentCount((int) $teamId),
                "Team {$teamId} should have exactly ".TeamCapacity::AGENTS_PER_TEAM.' active agents.',
            );
        }
    }

    public function test_enforce_for_team_deactivates_excess_agents(): void
    {
        $this->seed(RolePermissionSeeder::class);
        $team = Team::query()->create(['name' => 'تیم تست']);

        for ($i = 1; $i <= 20; $i++) {
            $agent = User::factory()->create([
                'email' => "overflow{$i}@saat.local",
                'team_id' => $team->id,
                'is_active' => true,
            ]);
            $agent->assignRole('agent');
        }

        $deactivated = TeamCapacity::enforceForTeam($team->id);

        $this->assertSame(5, $deactivated);
        $this->assertSame(TeamCapacity::AGENTS_PER_TEAM, TeamCapacity::activeAgentCount($team->id));
    }
}
