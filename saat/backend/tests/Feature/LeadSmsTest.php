<?php

use App\Models\AppSetting;
use App\Models\User;
use Illuminate\Support\Facades\Http;

beforeEach(fn () => seedRoles());

it('lists configured sms templates for agents', function (): void {
    AppSetting::syncMany([
        'meli_pattern_course' => 1001,
        'meli_pattern_channel' => 0,
        'meli_pattern_register' => 0,
        'meli_pattern_payment' => 0,
        'meli_pattern_custom' => 1005,
        'meli_sms_link_course' => 'https://rostami.app/courses',
    ]);

    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($agent, 'sanctum')
        ->getJson('/api/v1/sms/templates')
        ->assertOk()
        ->assertJsonPath('data.0.id', 'course')
        ->assertJsonPath('data.1.id', 'custom');
});

it('sends lead sms through melipayamak pattern api', function (): void {
    config([
        'melipayamak.username' => 'panel-user',
        'melipayamak.password' => 'panel-pass',
    ]);

    AppSetting::syncMany([
        'meli_pattern_course' => 2222,
        'meli_sms_link_course' => 'https://rostami.app/courses',
    ]);

    Http::fake([
        'rest.payamak-panel.com/*' => Http::response(['Value' => 987654]),
    ]);

    $agent = User::factory()->create(['referral_code' => 'ABC12']);
    $agent->assignRole('agent');

    $lead = makeLead([
        'first_name' => 'علی',
        'last_name' => 'رضایی',
        'phone' => '09121111111',
        'normalized_phone' => '09121111111',
        'assigned_agent_id' => $agent->id,
    ]);

    $this->actingAs($agent, 'sanctum')
        ->postJson("/api/v1/leads/{$lead->id}/sms", [
            'template' => 'course',
        ])
        ->assertOk()
        ->assertJsonPath('data.rec_id', '987654');

    Http::assertSent(function ($request) {
        return $request->url() === 'https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber'
            && (int) $request['bodyId'] === 2222
            && $request['text'] === 'علی رضایی;https://rostami.app/courses?ref=ABC12'
            && $request['to'] === '09121111111';
    });
});

it('sends course sms using product landing url when lead has product', function (): void {
    config([
        'melipayamak.username' => 'panel-user',
        'melipayamak.password' => 'panel-pass',
    ]);

    AppSetting::syncMany([
        'meli_pattern_course' => 2222,
        'meli_sms_link_course' => 'https://rostami.app/courses',
    ]);

    Http::fake([
        'rest.payamak-panel.com/*' => Http::response(['Value' => 987654]),
    ]);

    $agent = User::factory()->create(['referral_code' => 'ABC12']);
    $agent->assignRole('agent');

    $product = \App\Models\Product::query()->create([
        'name' => 'دوره تست',
        'slug' => 'test-course',
        'price' => 0,
        'commission_rate' => 10,
        'landing_url' => 'https://rostami.app/courses/sales-mastery',
        'is_active' => true,
    ]);

    $lead = makeLead([
        'first_name' => 'علی',
        'last_name' => 'رضایی',
        'phone' => '09121111111',
        'normalized_phone' => '09121111111',
        'assigned_agent_id' => $agent->id,
        'product_id' => $product->id,
    ]);

    $this->actingAs($agent, 'sanctum')
        ->postJson("/api/v1/leads/{$lead->id}/sms", [
            'template' => 'course',
        ])
        ->assertOk();

    Http::assertSent(function ($request) {
        return $request['text'] === 'علی رضایی;https://rostami.app/courses/sales-mastery?ref=ABC12';
    });
});

it('sends course sms using relative product landing url', function (): void {
    config([
        'melipayamak.username' => 'panel-user',
        'melipayamak.password' => 'panel-pass',
    ]);

    AppSetting::syncMany([
        'meli_pattern_course' => 2222,
        'meli_sms_link_course' => 'https://rostami.app/courses',
    ]);

    Http::fake([
        'rest.payamak-panel.com/*' => Http::response(['Value' => 987654]),
    ]);

    $agent = User::factory()->create(['referral_code' => 'ABC12']);
    $agent->assignRole('agent');

    $product = \App\Models\Product::query()->create([
        'name' => 'دوره نسبی',
        'slug' => 'relative-course',
        'price' => 0,
        'commission_rate' => 10,
        'landing_url' => '/courses/sales-mastery',
        'is_active' => true,
    ]);

    $lead = makeLead([
        'first_name' => 'علی',
        'last_name' => 'رضایی',
        'phone' => '09121111111',
        'normalized_phone' => '09121111111',
        'assigned_agent_id' => $agent->id,
        'product_id' => $product->id,
    ]);

    $this->actingAs($agent, 'sanctum')
        ->postJson("/api/v1/leads/{$lead->id}/sms", [
            'template' => 'course',
        ])
        ->assertOk();

    Http::assertSent(function ($request) {
        return $request['text'] === 'علی رضایی;https://rostami.app/courses/sales-mastery?ref=ABC12';
    });
});

it('rejects custom sms without body', function (): void {
    AppSetting::syncMany(['meli_pattern_custom' => 3333]);

    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $lead = makeLead([
        'assigned_agent_id' => $agent->id,
    ]);

    $this->actingAs($agent, 'sanctum')
        ->postJson("/api/v1/leads/{$lead->id}/sms", [
            'template' => 'custom',
        ])
        ->assertUnprocessable();
});
