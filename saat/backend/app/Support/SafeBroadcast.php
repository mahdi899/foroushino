<?php

namespace App\Support;

use Illuminate\Support\Facades\Log;

/** Fire-and-forget broadcast — never fails the caller when Reverb/Pusher is down. */
final class SafeBroadcast
{
    public static function optionally(callable $broadcast): void
    {
        try {
            $broadcast();
        } catch (\Throwable $e) {
            Log::warning('Broadcast skipped', ['error' => $e->getMessage()]);
        }
    }
}
