<?php

namespace App\Modules\TelegramBot\Handlers;

use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramUpdate;

/**
 * One handler per Telegram update type (see TelegramUpdateType). Handlers
 * are resolved out of the container by UpdateRouter, so they may type-hint
 * any dependency (repositories, the bot client factory, etc.) in their
 * constructor.
 */
interface UpdateHandlerInterface
{
    public function handle(TelegramUpdate $update, TelegramBot $bot): void;
}
