<?php

namespace App\Contracts\Telephony;

use App\Models\Call;
use App\Models\Lead;

/**
 * Future VoIP provider plug-in surface (Asterisk AMI, WebRTC SIP, etc.).
 * Native SIM remains the default path until a concrete provider is wired.
 */
interface VoipProviderInterface
{
    /**
     * @return array<string, mixed>
     */
    public function startSession(Call $call, Lead $lead): array;

    public function healthCheck(): bool;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function handleWebhook(array $payload): void;
}
