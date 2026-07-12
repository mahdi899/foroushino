<?php

namespace App\Http\Middleware;

use App\Models\SatIntegrationToken;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateSatIntegrationToken
{
    public function handle(Request $request, Closure $next, string $ability = 'inbound:applications'): Response
    {
        $header = $request->bearerToken();
        if (! $header) {
            return $this->deny('missing_token', 'توکن احراز هویت ارسال نشده است.');
        }

        $hash = hash('sha256', $header);
        $record = SatIntegrationToken::query()
            ->where('token_hash', $hash)
            ->whereNull('revoked_at')
            ->first();

        if (! $record || ! $record->hasAbility($ability)) {
            return $this->deny('invalid_token', 'توکن نامعتبر یا لغوشده است.');
        }

        $record->update(['last_used_at' => now()]);
        $request->attributes->set('sat_integration_token', $record);

        return $next($request);
    }

    private function deny(string $code, string $messageFa): Response
    {
        return response()->json([
            'error' => [
                'code' => $code,
                'message_fa' => $messageFa,
            ],
        ], 401);
    }
}
