<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Enums\UpdateStatus;
use App\Modules\TelegramBot\Enums\UpdateType;
use App\Modules\TelegramBot\Handlers\CallbackQueryHandler;
use App\Modules\TelegramBot\Handlers\ChatJoinRequestHandler;
use App\Modules\TelegramBot\Handlers\ChatMemberHandler;
use App\Modules\TelegramBot\Handlers\EditedMessageHandler;
use App\Modules\TelegramBot\Handlers\MessageHandler;
use App\Modules\TelegramBot\Handlers\MyChatMemberHandler;
use App\Modules\TelegramBot\Handlers\UpdateHandlerInterface;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use App\Modules\TelegramBot\Repositories\TelegramUpdateRepository;
use Illuminate\Contracts\Container\Container;

class UpdateRouter
{
    /** @var array<string, class-string<UpdateHandlerInterface>> */
    private array $handlers = [
        UpdateType::Message->value => MessageHandler::class,
        UpdateType::EditedMessage->value => EditedMessageHandler::class,
        UpdateType::CallbackQuery->value => CallbackQueryHandler::class,
        UpdateType::MyChatMember->value => MyChatMemberHandler::class,
        UpdateType::ChatMember->value => ChatMemberHandler::class,
        UpdateType::ChatJoinRequest->value => ChatJoinRequestHandler::class,
    ];

    public function __construct(
        private readonly Container $container,
        private readonly TelegramUpdateRepository $updates,
    ) {}

    public function route(TelegramUpdate $update, TelegramBot $bot): void
    {
        $this->updates->markProcessing($update);

        $handlerClass = $this->handlers[$update->update_type->value] ?? null;

        if ($handlerClass === null) {
            $this->updates->markSkipped($update);

            return;
        }

        /** @var UpdateHandlerInterface $handler */
        $handler = $this->container->make($handlerClass);
        $handler->handle($update, $bot);

        $this->updates->markProcessed($update);
    }
}
