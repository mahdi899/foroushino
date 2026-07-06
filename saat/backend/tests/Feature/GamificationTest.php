<?php

use App\Actions\Calls\SubmitCallResultAction;
use App\Models\UserAchievement;

beforeEach(function () {
    seedRoles();
    seedAchievements();
});

it('unlocks the first_call achievement and notifies the agent after their first logged call', function () {
    $agent = makeAgent();
    $lead = makeLead(['assigned_agent_id' => $agent->id]);
    $call = startCallFor($agent, $lead);

    app(SubmitCallResultAction::class)->execute($call, ['result' => 'no_answer']);

    $unlocked = UserAchievement::query()
        ->whereHas('achievement', fn ($q) => $q->where('code', 'first_call'))
        ->where('user_id', $agent->id)
        ->first();

    expect($unlocked)->not->toBeNull();
    expect($unlocked->unlocked_at)->not->toBeNull();
    expect($agent->appNotifications()->count())->toBe(1);
});

it('awards points to an agent for every logged call', function () {
    $agent = makeAgent();
    $lead = makeLead(['assigned_agent_id' => $agent->id]);
    $call = startCallFor($agent, $lead);

    app(SubmitCallResultAction::class)->execute($call, ['result' => 'no_answer']);

    expect($agent->fresh()->points)->toBe(2);
});

it('lists achievements with unlocked flags scoped to the current user', function () {
    $agent = makeAgent();
    UserAchievement::query()->create([
        'user_id' => $agent->id,
        'achievement_id' => \App\Models\Achievement::where('code', 'first_call')->value('id'),
        'progress' => 1,
        'unlocked_at' => now(),
    ]);

    $response = $this->actingAs($agent, 'sanctum')->getJson('/api/v1/gamification/achievements');

    $response->assertOk();
    $firstCall = collect($response->json('data'))->firstWhere('code', 'first_call');
    expect($firstCall['unlocked'])->toBeTrue();
    $tenSales = collect($response->json('data'))->firstWhere('code', 'ten_sales');
    expect($tenSales['unlocked'])->toBeFalse();
});

it('ranks the leaderboard by confirmed sales this month, scoped to the agent\'s team', function () {
    $team = makeTeam();
    $topAgent = makeAgent(['team_id' => $team->id, 'points' => 10]);
    $lowAgent = makeAgent(['team_id' => $team->id, 'points' => 500]);
    $product = makeProduct();

    for ($i = 0; $i < 3; $i++) {
        $lead = makeLead(['assigned_agent_id' => $topAgent->id, 'product_id' => $product->id]);
        makeSaleFor($topAgent, $lead, $product, 'confirmed');
    }

    $response = $this->actingAs($lowAgent, 'sanctum')->getJson('/api/v1/gamification/leaderboard?scope=team');

    $response->assertOk();
    $entries = $response->json('data.entries');
    expect($entries[0]['agent_id'])->toBe($topAgent->id);
});
