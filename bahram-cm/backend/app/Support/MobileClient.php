<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class MobileClient
{
    public const MOBILE_ONLY_MESSAGE = 'تأیید هویت فقط از طریق گوشی موبایل امکان‌پذیر است. لطفاً پنل را روی گوشی خود باز کنید.';

    public static function isPhone(?string $userAgent): bool
    {
        $ua = trim((string) $userAgent);
        if ($ua === '') {
            return false;
        }

        if (preg_match('/ipad|tablet|playbook|silk|(android(?!.*mobile))/i', $ua)) {
            return false;
        }

        if (preg_match('/windows nt|macintosh|cros|linux x86_64|x11/i', $ua)
            && ! preg_match('/mobile|iphone|ipod|android.*mobile|iemobile|opera mini|webos/i', $ua)) {
            return false;
        }

        return (bool) preg_match('/mobile|iphone|ipod|android.*mobile|blackberry|iemobile|opera mini|webos/i', $ua);
    }

    public static function denyUnlessPhone(Request $request): ?JsonResponse
    {
        if (self::isPhone($request->userAgent())) {
            return null;
        }

        return ApiResponse::error('mobile_only', self::MOBILE_ONLY_MESSAGE, 403);
    }
}
