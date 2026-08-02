<?php

namespace App\Support;

use App\Services\GuestCheckoutTokenService;
use Illuminate\Http\Request;

/**
 * Builds a stable, non-PII purchase rate-limit identifier.
 *
 * Priority: authenticated user → hashed mobile → real client IP.
 */
final class PurchaseRateLimit
{
    public static function identifier(Request $request): string
    {
        $user = $request->user();
        if ($user && $user->getAuthIdentifier()) {
            return 'user:'.$user->getAuthIdentifier();
        }

        $mobile = self::resolveMobile($request);
        if ($mobile) {
            return 'mobile:'.hash('sha256', $mobile);
        }

        return 'ip:'.($request->ip() ?: 'unknown');
    }

    public static function hashMobile(string $mobile): string
    {
        return hash('sha256', $mobile);
    }

    private static function resolveMobile(Request $request): ?string
    {
        $fromBody = Mobile::normalize((string) $request->input('customer_phone', ''));
        if ($fromBody) {
            return $fromBody;
        }

        $checkoutToken = (string) $request->input('checkout_token', '');
        if ($checkoutToken === '') {
            return null;
        }

        try {
            $checkout = app(GuestCheckoutTokenService::class)->resolve($checkoutToken);
        } catch (\Throwable) {
            return null;
        }

        if (! is_array($checkout)) {
            return null;
        }

        return Mobile::normalize((string) ($checkout['customer_phone'] ?? '')) ?: null;
    }
}
