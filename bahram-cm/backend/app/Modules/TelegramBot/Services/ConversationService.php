<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Enums\ConversationState;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramConversation;
use Illuminate\Support\Facades\DB;

class ConversationService
{
    public function getOrCreate(TelegramAccount $account): TelegramConversation
    {
        return TelegramConversation::query()->firstOrCreate(
            ['telegram_account_id' => $account->id],
            [
                'state' => ConversationState::Idle,
                'version' => 1,
                'context' => [],
            ],
        );
    }

    public function forAccount(TelegramAccount $account): TelegramConversation
    {
        return $this->getOrCreate($account);
    }

    /**
     * @param  array<string, mixed>  $contextPatch
     */
    public function mergeContext(TelegramConversation $conversation, array $contextPatch): TelegramConversation
    {
        return $this->transition($conversation, $conversation->state, $contextPatch);
    }

    /**
     * @param  array<string, mixed>  $contextPatch
     */
    public function transition(
        TelegramConversation $conversation,
        ConversationState $nextState,
        array $contextPatch = [],
    ): TelegramConversation {
        $expectedVersion = $conversation->version;

        $updated = DB::transaction(function () use ($conversation, $nextState, $contextPatch, $expectedVersion): int {
            $fresh = TelegramConversation::query()->lockForUpdate()->find($conversation->id);

            if ($fresh === null || $fresh->version !== $expectedVersion) {
                throw new \RuntimeException('Conversation version conflict.');
            }

            $context = array_merge($fresh->context ?? [], $contextPatch);

            $fresh->state = $nextState;
            $fresh->version = $expectedVersion + 1;
            $fresh->context = $context;

            return $fresh->save() ? 1 : 0;
        });

        if ($updated === 0) {
            throw new \RuntimeException('Conversation version conflict.');
        }

        return $conversation->refresh();
    }

    public function reset(TelegramConversation $conversation): TelegramConversation
    {
        $conversation->refresh();

        return $this->transition($conversation, ConversationState::Idle);
    }
}
