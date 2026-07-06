<?php

namespace App\Services\Exceptions;

use RuntimeException;

/**
 * Thrown whenever the AI service is unavailable, misconfigured, or a request
 * to the underlying provider fails. The message is always safe to show to
 * an admin (Persian, no sensitive details).
 */
class AiServiceException extends RuntimeException {}
