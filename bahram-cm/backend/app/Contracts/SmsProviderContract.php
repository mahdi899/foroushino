<?php

namespace App\Contracts;

interface SmsProviderContract
{
    /**
     * @return array{success: bool, message: string, raw: mixed}
     */
    public function send(string $mobile, string $message): array;

    /**
     * @return array{success: bool, message: string}
     */
    public function testConnection(): array;
}
