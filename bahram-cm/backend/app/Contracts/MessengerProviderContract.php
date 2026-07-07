<?php

namespace App\Contracts;

interface MessengerProviderContract
{
    public function key(): string;

    public function label(): string;

    /** 'available' when credentials are configured, otherwise 'unavailable'. */
    public function status(): string;

    /**
     * @return array{success: bool, message: string}
     */
    public function testConnection(): array;

    /**
     * @return array{success: bool, message: string}
     */
    public function send(string $chatId, string $message): array;
}
