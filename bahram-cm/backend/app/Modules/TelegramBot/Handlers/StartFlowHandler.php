<?php

namespace App\Modules\TelegramBot\Handlers;

use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use App\Modules\TelegramBot\Services\AccountLinkService;
use App\Modules\TelegramBot\Services\ConversationService;
use App\Modules\TelegramBot\Services\RegistrationFlowService;

class StartFlowHandler
{
    public function __construct(
        private readonly AccountLinkService $accountLinks,
        private readonly ConversationService $conversations,
        private readonly RegistrationFlowService $registration,
    ) {}

    public function handle(TelegramBot $bot, array $from, ?string $startPayload = null): void
    {
        $account = $this->accountLinks->findOrCreateAccount(
            $bot,
            (int) $from['id'],
            $from['username'] ?? null,
            $from['first_name'] ?? null,
            $from['last_name'] ?? null,
            $from['language_code'] ?? null,
        );

        $conversation = $this->conversations->getOrCreate($account);
        $this->registration->start($bot, $account, $conversation);
    }
}
