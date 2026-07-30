<?php

declare(strict_types=1);

namespace TelegramHost\Routing;

use TelegramHost\Account\AccountCache;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Http\AdminFastClient;
use TelegramHost\Conversation\ConversationRepository;
use TelegramHost\Handlers\CallbackQueryHandler;
use TelegramHost\Handlers\MessageHandler;
use TelegramHost\Services\GroupJoinMessageCleaner;
use TelegramHost\Services\HostAdminShell;
use TelegramHost\Services\HostSupportService;
use TelegramHost\Services\MainMenu;
use TelegramHost\Telegram\BotApiClient;
use TelegramHost\Support\TelegramCustomEmoji;

/** Local MySQL first; Iran is optional sync/queue — users never see "main server down". */
final class UpdateRouter
{
    public function __construct(
        private readonly DelegationDetector $delegation,
        private readonly IranSyncRelay $iranSync,
        private readonly AdminFastClient $adminFast,
        private readonly AccountCache $accounts,
        private readonly SyncCache $cache,
        private readonly BotApiClient $api,
        private readonly MessageHandler $messages,
        private readonly CallbackQueryHandler $callbacks,
        private readonly HostSupportService $support,
        private readonly MainMenu $mainMenu,
        private readonly ConversationRepository $conversations,
        private readonly HostAdminShell $adminShell,
        private readonly GroupJoinMessageCleaner $groupJoinCleaner,
    ) {}

    /** @param array<string, mixed> $update */
    public function handle(array $update): void
    {
        // Reports-group support replies are handled locally — no Iran needed.
        if (isset($update['message']) && ! $this->delegation->isPrivateUserFacing($update)) {
            if ($this->support->tryHandleGroupMessage($update['message'])) {
                return;
            }

            if ($this->groupJoinCleaner->tryDeleteJoinMessage($update['message'])) {
                return;
            }
        }

        // Main-menu labels must not block admin Iran relay while admin panel is open.
        $mainMenuText = trim((string) ($update['message']['text'] ?? ''));
        $telegramUserId = $this->extractTelegramUserId($update);
        $isMainMenuTap = $mainMenuText !== ''
            && $this->delegation->isPrivateUserFacing($update)
            && $this->mainMenu->resolveAction($mainMenuText) !== null
            && ! $this->isAdminPanelRelay($telegramUserId, $mainMenuText);

        if (! $isMainMenuTap && $this->delegation->shouldRelayToIran($update)) {
            if (! $this->delegation->isPrivateUserFacing($update)) {
                $this->iranSync->enqueue($update);

                return;
            }

            if ($this->delegation->shouldTrySyncRelayToIran($update)) {
                $telegramUserId = $this->extractTelegramUserId($update);
                $chatId = $this->extractChatId($update);
                if ($this->adminFast->tryDispatch($chatId, $telegramUserId, $update)) {
                    return;
                }
                $timeout = $this->delegation->syncRelayTimeoutSeconds($update);
                if ($this->iranSync->tryRelay($chatId, $telegramUserId, $update, $timeout)) {
                    return;
                }

                // Media admin input is queued for post-response drain — do not
                // fall through to the local "admin server down" stub handler.
                if ($timeout > 5) {
                    return;
                }
            } else {
                $this->iranSync->enqueue($update);
            }
        }

        if (! $this->delegation->isPrivateUserFacing($update)) {
            return;
        }

        $telegramUserId = $this->extractTelegramUserId($update);

        if ($telegramUserId > 0 && ! $this->cache->botIsActive() && ! $this->accounts->isBotAdmin($telegramUserId)) {
            $chatId = $this->extractChatId($update);
            if ($chatId > 0) {
                $this->api->sendMessage($chatId, TelegramCustomEmoji::tag('warning').' ربات موقتاً غیرفعال است. لطفاً بعداً دوباره تلاش کنید.');
            }

            return;
        }

        if (isset($update['message'])) {
            $this->messages->handle($update['message']);

            return;
        }

        if (isset($update['callback_query'])) {
            $this->callbacks->handle($update['callback_query']);
        }
    }

    /** @param array<string, mixed> $update */
    private function extractTelegramUserId(array $update): int
    {
        foreach (['message', 'callback_query', 'edited_message'] as $key) {
            $id = (int) ($update[$key]['from']['id'] ?? 0);
            if ($id > 0) {
                return $id;
            }
        }

        return 0;
    }

    /** @param array<string, mixed> $update */
    private function extractChatId(array $update): int
    {
        if (isset($update['message']['chat']['id'])) {
            return (int) $update['message']['chat']['id'];
        }

        if (isset($update['callback_query']['message']['chat']['id'])) {
            return (int) $update['callback_query']['message']['chat']['id'];
        }

        return $this->extractTelegramUserId($update);
    }

    private function isAdminPanelRelay(int $telegramUserId, string $text): bool
    {
        if ($telegramUserId <= 0 || ! $this->adminShell->isAdminButton($text)) {
            return false;
        }

        $conversation = $this->conversations->get($telegramUserId);

        return in_array($conversation['state'] ?? 'idle', ['admin_panel', 'admin_waiting_input'], true);
    }
}
