<?php

use App\Actions\Leads\DistributeLeadsToTeamsAction;
use App\Enums\LeadStatus;
use Illuminate\Http\UploadedFile;

beforeEach(function () {
    seedRoles();
});

it('lets a supervisor create a single lead manually', function () {
    $supervisor = makeSupervisor();

    $response = $this->actingAs($supervisor, 'sanctum')->postJson('/api/v1/leads', [
        'first_name' => 'رضا',
        'last_name' => 'کریمی',
        'phone' => '09120009999',
        'city' => 'تهران',
    ]);

    $response->assertCreated();
    expect($response->json('data.status'))->toBe('new');
    expect(\App\Models\Lead::where('normalized_phone', '09120009999')->exists())->toBeTrue();
});

it('lets a supervisor import leads from csv', function () {
    $supervisor = makeSupervisor();
    $csv = "first_name,last_name,phone,city,source\nسارا,محمدی,09120008888,اصفهان,excel\n";
    $file = UploadedFile::fake()->createWithContent('leads.csv', $csv);

    $this->actingAs($supervisor, 'sanctum')
        ->postJson('/api/v1/leads/import', ['file' => $file])
        ->assertOk()
        ->assertJsonPath('data.imported_count', 1);
});

it('distributes unassigned leads evenly across teams for supervisors', function () {
    $supervisor = makeSupervisor();
    $teamA = makeTeam(['name' => 'تیم آلفا']);
    $teamB = makeTeam(['name' => 'تیم بتا']);

    foreach (range(1, 4) as $i) {
        makeLead(['status' => LeadStatus::New->value]);
    }

    $result = app(DistributeLeadsToTeamsAction::class)->execute($supervisor, 200);

    expect($result['distributed'])->toBe(4);
    expect(\App\Models\Lead::where('assigned_team_id', $teamA->id)->count())->toBe(2);
    expect(\App\Models\Lead::where('assigned_team_id', $teamB->id)->count())->toBe(2);
    expect(\App\Models\Lead::whereNotNull('assigned_agent_id')->count())->toBe(0);
});

it('distributes leads to teams via the http endpoint', function () {
    $supervisor = makeSupervisor();
    makeTeam(['name' => 'تیم آلفا']);
    makeTeam(['name' => 'تیم بتا']);
    makeLead(['status' => LeadStatus::New->value]);
    makeLead(['status' => LeadStatus::New->value]);

    $response = $this->actingAs($supervisor, 'sanctum')
        ->postJson('/api/v1/leads/distribute-teams', ['limit' => 50]);

    $response->assertOk();
    expect($response->json('data.distributed'))->toBe(2);
});

it('does not let an agent in team A pull a lead assigned to team B', function () {
    $teamA = makeTeam();
    $teamB = makeTeam();
    $agentA = makeAgent(['team_id' => $teamA->id]);
    makeAgent(['team_id' => $teamB->id]);
    makeLead(['assigned_team_id' => $teamB->id, 'status' => LeadStatus::Assigned->value]);

    $result = app(\App\Actions\Leads\AssignNextLeadAction::class)->execute($agentA);

    expect($result['lead'])->toBeNull();
});

it('lets an agent in team B pull a lead assigned to their team', function () {
    $teamB = makeTeam();
    $agentB = makeAgent(['team_id' => $teamB->id]);
    $lead = makeLead(['assigned_team_id' => $teamB->id, 'status' => LeadStatus::Assigned->value]);

    $result = app(\App\Actions\Leads\AssignNextLeadAction::class)->execute($agentB);

    expect($result['lead'])->not->toBeNull();
    expect($result['lead']->id)->toBe($lead->id);
});
