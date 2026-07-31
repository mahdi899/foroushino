<?php

namespace App\Observers;

use App\Modules\TelegramBot\Models\TelegramRequiredChat;
use App\Services\TelegramHostCatalogRevision;

/** Push required-channel membership rules to the external Telegram host. */
class TelegramRequiredChatHostSyncObserver
{
    public function saved(TelegramRequiredChat $chat): void
    {
        if (! $chat->wasRecentlyCreated && ! $chat->wasChanged([
            'is_required',
            'is_active',
            'chat_id',
            'title',
            'invite_link',
            'sort_order',
        ])) {
            return;
        }

        app(TelegramHostCatalogRevision::class)->bump(scope: 'bootstrap');
    }

    public function deleted(TelegramRequiredChat $chat): void
    {
        app(TelegramHostCatalogRevision::class)->bump(scope: 'bootstrap');
    }
}
