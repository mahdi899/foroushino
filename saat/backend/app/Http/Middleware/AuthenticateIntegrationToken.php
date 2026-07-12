<?php

namespace App\Http\Middleware;

use App\Models\IntegrationToken;
use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateIntegrationToken
{
    public function handle(Request $request, Closure $next, string $ability = 'inbound:applications'): Response
    {
        $plain = $request->bearerToken();
        if (! $plain) {
            return ApiResponse::error('توکن احراز هویت ارسال نشده است.', status: 401, code: 'missing_token');
        }

        $record = IntegrationToken::query()
            ->where('token_hash', hash('sha256', $plain))
            ->whereNull('revoked_at')
            ->first();

        if (! $record || ! $record->hasAbility($ability)) {
            return ApiResponse::error('توکن نامعتبر یا لغوشده است.', status: 401, code: 'invalid_token');
        }

        $record->update(['last_used_at' => now()]);
        $request->attributes->set('integration_token', $record);

        return $next($request);
    }
}
