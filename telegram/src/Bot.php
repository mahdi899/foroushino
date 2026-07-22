<?php

declare(strict_types=1);

namespace TelegramHost;

use TelegramHost\Routing\UpdateRouter;

/**
 * Entry point for one Telegram update on the external host.
 * All routing (local vs delegate-to-Iran) lives in UpdateRouter.
 */
final class Bot
{
    public function __construct(private readonly UpdateRouter $router) {}

    /** @param array<string, mixed> $update */
    public function handle(array $update): void
    {
        $this->router->handle($update);
    }
}
