<?php

namespace App\Support;

final class EmailMask
{
    public static function mask(?string $email): ?string
    {
        if (blank($email)) {
            return null;
        }

        $trimmed = trim($email);
        $at = strpos($trimmed, '@');
        if ($at === false || $at <= 0) {
            return '***';
        }

        $local = substr($trimmed, 0, $at);
        $domain = substr($trimmed, $at + 1);
        $maskedLocal = strlen($local) <= 1 ? '*' : $local[0].'***';

        $dot = strrpos($domain, '.');
        if ($dot === false || $dot <= 0) {
            return $maskedLocal.'@'.($domain[0] ?? '*').'***';
        }

        $domainName = substr($domain, 0, $dot);
        $tld = substr($domain, $dot);
        $maskedDomain = strlen($domainName) <= 2
            ? ($domainName[0] ?? '*').'***'
            : substr($domainName, 0, 2).'***';

        return $maskedLocal.'@'.$maskedDomain.$tld;
    }
}
