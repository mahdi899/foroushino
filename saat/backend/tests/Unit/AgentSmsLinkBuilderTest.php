<?php

use App\Enums\LeadSmsTemplate;
use App\Models\User;
use App\Services\Sms\AgentSmsLinkBuilder;
use Tests\TestCase;

uses(TestCase::class);

it('passes settings to withBase when building template links', function (): void {
    config(['app.url' => 'http://localhost']);

    $agent = User::factory()->make(['referral_code' => 'REF99']);

    $settings = [
        'meli_sms_link_course' => 'https://rostami.app/courses',
        'meli_sms_link_channel' => '/telegram/channel',
    ];

    $link = AgentSmsLinkBuilder::for($agent, LeadSmsTemplate::Channel, $settings);

    expect($link)->toBe('https://rostami.app/telegram/channel?ref=REF99');
});

it('keeps absolute sms links unchanged', function (): void {
    $agent = User::factory()->make(['referral_code' => 'REF99']);

    $settings = [
        'meli_sms_link_course' => 'https://rostami.app/courses',
        'meli_sms_link_payment' => 'https://pay.example.com/checkout',
    ];

    $link = AgentSmsLinkBuilder::for($agent, LeadSmsTemplate::Payment, $settings);

    expect($link)->toBe('https://pay.example.com/checkout?ref=REF99');
});
