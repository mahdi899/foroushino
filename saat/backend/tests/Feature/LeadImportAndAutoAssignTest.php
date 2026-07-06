<?php

use App\Actions\Leads\AutoAssignLeadsAction;
use App\Actions\Leads\ImportLeadsAction;
use App\Enums\LeadStatus;
use Illuminate\Http\UploadedFile;

beforeEach(function () {
    seedRoles();
});

it('imports new leads and flags rows with an already-known phone number as duplicates', function () {
    $manager = makeManager();
    $existing = makeLead(['normalized_phone' => '09120001111']);

    $rows = [
        ['first_name' => 'علی', 'last_name' => 'رضایی', 'phone' => '09120002222', 'city' => 'تهران', 'source' => 'excel'],
        ['first_name' => 'زهرا', 'last_name' => 'احمدی', 'phone' => '09120001111', 'city' => 'تهران', 'source' => 'excel'],
    ];

    $batch = app(ImportLeadsAction::class)->execute($rows, $manager, 'leads.csv');

    expect($batch->total_rows)->toBe(2);
    expect($batch->imported_count)->toBe(1);
    expect($batch->duplicate_count)->toBe(1);
    expect($batch->status->value)->toBe('completed');

    $duplicateLead = \App\Models\Lead::query()->where('normalized_phone', '09120001111')
        ->where('id', '!=', $existing->id)->first();
    expect($duplicateLead->status)->toBe(LeadStatus::Duplicate);
    expect($duplicateLead->duplicate_of_id)->toBe($existing->id);
});

it('rejects rows missing a name or phone number as errors without crashing the batch', function () {
    $manager = makeManager();
    $rows = [
        ['first_name' => '', 'last_name' => 'بی‌نام', 'phone' => '09120003333'],
        ['first_name' => 'محمد', 'last_name' => 'کریمی', 'phone' => ''],
    ];

    $batch = app(ImportLeadsAction::class)->execute($rows, $manager);

    expect($batch->imported_count)->toBe(0);
    expect($batch->error_count)->toBe(2);
});

it('uploads a CSV file through the HTTP endpoint when the user has the import permission', function () {
    $manager = makeManager();
    $csv = "first_name,last_name,phone,city,source\nسارا,محمدی,09120004444,اصفهان,excel\n";
    $file = UploadedFile::fake()->createWithContent('leads.csv', $csv);

    $response = $this->actingAs($manager, 'sanctum')
        ->postJson('/api/v1/leads/import', ['file' => $file]);

    $response->assertOk();
    expect($response->json('data.imported_count'))->toBe(1);
});

it('forbids an agent without the import permission from uploading leads', function () {
    $agent = makeAgent();
    $csv = "first_name,last_name,phone\nسارا,محمدی,09120005555\n";
    $file = UploadedFile::fake()->createWithContent('leads.csv', $csv);

    $this->actingAs($agent, 'sanctum')
        ->postJson('/api/v1/leads/import', ['file' => $file])
        ->assertForbidden();
});

it('spreads unassigned leads evenly across active agents in round-robin order', function () {
    $manager = makeManager();
    $agentA = makeAgent();
    $agentB = makeAgent();
    foreach (range(1, 4) as $i) {
        makeLead();
    }

    $result = app(AutoAssignLeadsAction::class)->execute($manager, 200);

    expect($result['assigned'])->toBe(4);
    expect(\App\Models\Lead::where('assigned_agent_id', $agentA->id)->count())->toBe(2);
    expect(\App\Models\Lead::where('assigned_agent_id', $agentB->id)->count())->toBe(2);
});

it('does not auto-assign leads that are already excluded from the calling cycle', function () {
    $manager = makeManager();
    makeAgent();
    makeLead(['status' => 'do_not_call', 'do_not_call_at' => now()]);
    makeLead(['status' => 'won']);

    $result = app(AutoAssignLeadsAction::class)->execute($manager, 200);

    expect($result['assigned'])->toBe(0);
});
