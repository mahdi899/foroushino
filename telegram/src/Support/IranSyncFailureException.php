<?php

declare(strict_types=1);

namespace TelegramHost\Support;

/**
 * Thrown by SyncClient for every failed (or circuit-skipped) call to Iran.
 *
 * Carries the circuit breaker's own notification decision so callers
 * (ResilientLiveClient, IranSyncRelay) never need a second breaker instance
 * to decide whether to alert the reports group. Previously each caller ran
 * its own `IranCircuitBreaker::recordFailure()` on top of SyncClient's,
 * which double-counted failures and kept resetting the cooldown timer under
 * traffic — the circuit never actually closed while users kept messaging.
 */
final class IranSyncFailureException extends \RuntimeException
{
    public function __construct(
        string $message,
        public readonly bool $shouldNotify,
        public readonly bool $wasAlreadyDown,
        public readonly bool $circuitOpenSkip,
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }
}
