<?php

namespace App\Modules\TelegramBot\Http\Middleware;

use App\Services\TelegramInfrastructureService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guards the `telegram-host` sync API (external host app <-> this server).
 * Runs after `proxy.origin:presence` (X-Proxy-Origin + Bearer presence) and
 * validates the Bearer token against `host_sync_secret`. Request/response
 * bodies are plain JSON over HTTPS — no AES/HMAC wire format.
 *
 * Decrypted JSON is placed on `$request->attributes->get('host_payload')`.
 */
class VerifyTelegramHostToken
{
    public function __construct(
        private readonly TelegramInfrastructureService $infrastructure,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $secret = $this->infrastructure->hostSyncSecret();

        if (! $this->infrastructure->usesHostBridge() || $secret === null || $secret === '') {
            return $this->deny('host_bridge_not_configured');
        }

        $bearer = (string) ($request->bearerToken() ?? '');
        if ($bearer === '' || ! hash_equals($secret, $bearer)) {
            return $this->deny('host_token_invalid');
        }

        $raw = (string) $request->getContent();
        if ($raw === '') {
            $request->attributes->set('host_payload', []);

            return $next($request);
        }

        $payload = json_decode($raw, true);
        if (! is_array($payload)) {
            return response()->json([
                'error' => ['code' => 'host_json_invalid', 'message' => 'invalid_json'],
            ], 422);
        }

        $request->attributes->set('host_payload', $payload);

        return $next($request);
    }

    private function deny(string $reason): Response
    {
        return response()->json([
            'error' => ['code' => 'host_token_invalid', 'message' => $reason],
        ], 403);
    }
}
