<?php

namespace App\Services\Exceptions;

use RuntimeException;

/**
 * Thrown for any payment gateway configuration or communication error.
 * Messages are always safe, Persian, and suitable for API responses.
 */
class PaymentException extends RuntimeException {}
