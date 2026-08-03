<?php

namespace App\Exceptions;

use RuntimeException;

class ChatbotTicketConversionException extends RuntimeException
{
    public function __construct(
        public readonly string $errorCode,
        string $messageFa,
        public readonly int $status = 422,
    ) {
        parent::__construct($messageFa);
    }
}
