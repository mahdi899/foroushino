<?php

namespace App\Http\Concerns;

use Illuminate\Http\Request;

trait VerifiesInternalSecret
{
    /** Next.js server-to-server calls — skip strict secret check in local/testing. */
    protected function verifyInternalSecret(Request $request): bool
    {
        if (app()->environment('local', 'testing')) {
            return true;
        }

        $secret = trim((string) config('bahram.internal_api.secret', ''));
        if ($secret === '') {
            return false;
        }

        $header = trim((string) (
            $request->header('X-Internal-Secret')
            ?: $request->header('X-Revalidate-Secret')
        ));

        return hash_equals($secret, $header);
    }
}
