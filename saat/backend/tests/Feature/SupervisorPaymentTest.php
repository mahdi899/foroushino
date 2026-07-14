<?php

use App\Enums\SaleStatus;

beforeEach(function () {
    seedRoles();
});

it('lets a supervisor register payment on behalf of an agent', function () {
    $team = makeTeam();
    $agent = makeAgent(['team_id' => $team->id]);
    $supervisor = makeSupervisor();
    $lead = makeLead(['assigned_team_id' => $team->id, 'assigned_agent_id' => $agent->id]);
    $product = makeProduct();
    $sale = makeSaleFor($agent, $lead, $product, SaleStatus::PaymentPending->value);

    $response = $this->actingAs($supervisor, 'sanctum')->postJson("/api/v1/sales/{$sale->id}/submit-payment", [
        'method' => 'card',
        'reference_number' => 'SUP-REF-001',
    ]);

    $response->assertOk();
    expect($sale->fresh()->status)->toBe(SaleStatus::PaymentSubmitted);
});

it('forbids an agent from registering payment for another agent sale', function () {
    $team = makeTeam();
    $agentA = makeAgent(['team_id' => $team->id]);
    $agentB = makeAgent(['team_id' => $team->id]);
    $lead = makeLead(['assigned_team_id' => $team->id, 'assigned_agent_id' => $agentA->id]);
    $product = makeProduct();
    $sale = makeSaleFor($agentA, $lead, $product, SaleStatus::PaymentPending->value);

    $this->actingAs($agentB, 'sanctum')
        ->postJson("/api/v1/sales/{$sale->id}/submit-payment", [
            'method' => 'card',
            'reference_number' => 'X',
        ])
        ->assertForbidden();
});
