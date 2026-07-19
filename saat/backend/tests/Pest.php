<?php

use App\Enums\RoleName;
use App\Models\Product;
use App\Models\Team;
use App\Models\User;
use Database\Seeders\AchievementSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

pest()->extend(Tests\TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

function seedRoles(): void
{
    app(RolePermissionSeeder::class)->run();
}

function seedAchievements(): void
{
    app(AchievementSeeder::class)->run();
}

function makeTeam(array $attrs = []): Team
{
    return Team::query()->create(array_merge(['name' => 'تیم تست'], $attrs));
}

function makeProduct(array $attrs = []): Product
{
    return Product::query()->create(array_merge([
        'name' => 'دوره تست',
        'slug' => 'test-product-'.uniqid(),
        'price' => 5_000_000,
        'commission_rate' => 10,
    ], $attrs));
}

function makeAgent(array $attrs = []): User
{
    $user = User::factory()->create(array_merge(['points' => 0, 'streak' => 0], $attrs));
    $user->assignRole(RoleName::Agent->value);
    \App\Models\Wallet::query()->firstOrCreate(['user_id' => $user->id]);

    return $user;
}

function makeManager(array $attrs = []): User
{
    $user = User::factory()->create($attrs);
    $user->assignRole(RoleName::Manager->value);

    return $user;
}

function makeAdmin(array $attrs = []): User
{
    $user = User::factory()->create($attrs);
    $user->assignRole(RoleName::Manager->value);

    return $user;
}

function makeSupervisor(array $attrs = []): User
{
    $user = User::factory()->create($attrs);
    $user->assignRole(RoleName::Supervisor->value);

    return $user;
}

function makeLeader(array $attrs = []): User
{
    $user = User::factory()->create($attrs);
    $user->assignRole(RoleName::Leader->value);

    return $user;
}

function makeLead(array $attrs = []): \App\Models\Lead
{
    static $seq = 0;
    $seq++;

    return \App\Models\Lead::query()->create(array_merge([
        'first_name' => 'مشتری',
        'last_name' => 'تست'.$seq,
        'phone' => '0912000'.str_pad((string) $seq, 4, '0', STR_PAD_LEFT),
        'normalized_phone' => '0912000'.str_pad((string) $seq, 4, '0', STR_PAD_LEFT),
        'temperature' => 'warm',
    ], $attrs));
}

function startCallFor(\App\Models\User $agent, \App\Models\Lead $lead): \App\Models\Call
{
    $call = \App\Models\Call::query()->create([
        'lead_id' => $lead->id,
        'agent_id' => $agent->id,
        'started_at' => now(),
    ]);

    $lead->forceFill(['last_call_at' => now()])->save();

    return $call;
}

function makeSaleFor(\App\Models\User $agent, \App\Models\Lead $lead, \App\Models\Product $product, string $status = 'payment_pending'): \App\Models\Sale
{
    return \App\Models\Sale::query()->create([
        'lead_id' => $lead->id,
        'agent_id' => $agent->id,
        'team_id' => $agent->team_id,
        'product_id' => $product->id,
        'amount' => 4_000_000,
        'status' => $status,
    ]);
}
