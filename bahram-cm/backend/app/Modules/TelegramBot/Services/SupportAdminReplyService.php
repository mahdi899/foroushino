<?php

namespace App\Modules\TelegramBot\Services;

use App\Models\TicketMessage;
use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramMessageMap;
use App\Modules\TelegramBot\Support\TelegramHtml;
use Throwable;

/**
 * Reports-group operators reply to a user-thread message → deliver to that same user message in private chat.
 */
class SupportAdminReplyService
{
    public function __construct(
        private readonly TelegramBotClientFactory $clients,
        private readonly SupportTicketBridgeService $bridge,
    ) {}

    /** @param  array<string, mixed>  $message */
    public function handleIncomingSupportMessage(TelegramBot $bot, array $message): void
    {
        if (blank($bot->reportsGroupChatId())) {
            return;
        }

        $replyToId = (int) data_get($message, 'reply_to_message.message_id');
        $fromId = (int) data_get($message, 'from.id');
        $adminMessageId = (int) ($message['message_id'] ?? 0);
        $groupChatId = (string) data_get($message, 'chat.id');

        if ($replyToId <= 0 || $fromId <= 0 || $adminMessageId <= 0) {
            return;
        }

        if ((bool) data_get($message, 'from.is_bot')) {
            return;
        }

        $resolved = $this->resolveUserThread($bot, $groupChatId, $replyToId, $message);
        if ($resolved === null) {
            return;
        }

        $this->deliverMapped(
            $bot,
            $resolved['map'],
            $message,
            $groupChatId,
            $adminMessageId,
            $resolved['user_chat_id'],
            $resolved['reply_to_user_message_id'],
        );
    }

    /**
     * Resolve which private user message this group reply belongs to.
     *
     * @param  array<string, mixed>  $message
     * @return array{map: TelegramMessageMap, user_chat_id: string, reply_to_user_message_id: int}|null
     */
    private function resolveUserThread(TelegramBot $bot, string $groupChatId, int $replyToId, array $message): ?array
    {
        $supportChat = (string) $bot->reportsGroupChatId();

        // 1) Exact match on ID-anchor message for this user turn.
        $map = TelegramMessageMap::query()
            ->where('target_chat_id', $supportChat)
            ->where('direction', 'user_to_support')
            ->where('target_message_id', $replyToId)
            ->latest('id')
            ->first();

        // 2) Match on forwarded user message in the group.
        if ($map === null) {
            $map = TelegramMessageMap::query()
                ->where('target_chat_id', $supportChat)
                ->where('direction', 'user_to_support')
                ->where('media_group_id', (string) $replyToId)
                ->latest('id')
                ->first();
        }

        if ($map !== null) {
            return [
                'map' => $map,
                'user_chat_id' => (string) $map->source_chat_id,
                'reply_to_user_message_id' => (int) $map->source_message_id,
            ];
        }

        // 3) Admin replied to a previous bot-delivered answer in the group thread
        //    (support_to_user.source_message_id = that admin/group message).
        $deliveryMap = TelegramMessageMap::query()
            ->where('direction', 'support_to_user')
            ->where('source_chat_id', $supportChat)
            ->where('source_message_id', $replyToId)
            ->latest('id')
            ->first();

        if ($deliveryMap !== null) {
            $userMsgId = (int) ($deliveryMap->media_group_id ?: 0);
            if ($userMsgId <= 0 && $deliveryMap->ticket_id) {
                $prior = TelegramMessageMap::query()
                    ->where('direction', 'user_to_support')
                    ->where('ticket_id', $deliveryMap->ticket_id)
                    ->latest('id')
                    ->first();
                $userMsgId = (int) ($prior?->source_message_id ?? 0);
            }

            $userChatId = '';
            if ($deliveryMap->ticket_id) {
                $priorUser = TelegramMessageMap::query()
                    ->where('direction', 'user_to_support')
                    ->where('ticket_id', $deliveryMap->ticket_id)
                    ->latest('id')
                    ->first();
                $userChatId = (string) ($priorUser?->source_chat_id ?? '');
            }

            if ($userChatId === '') {
                // target of support_to_user is the private chat id.
                $userChatId = (string) $deliveryMap->target_chat_id;
            }

            return [
                'map' => $deliveryMap,
                'user_chat_id' => $userChatId,
                'reply_to_user_message_id' => $userMsgId,
            ];
        }

        // 4) Fallback: reply-to text is the numeric telegram user id card.
        $replyText = trim((string) data_get($message, 'reply_to_message.text', ''));
        $userId = $this->extractTelegramUserId($replyText);
        if ($userId === null) {
            return null;
        }

        $latest = TelegramMessageMap::query()
            ->where('direction', 'user_to_support')
            ->where('source_chat_id', (string) $userId)
            ->where('target_chat_id', $supportChat)
            ->latest('id')
            ->first();

        if ($latest !== null) {
            return [
                'map' => $latest,
                'user_chat_id' => (string) $userId,
                'reply_to_user_message_id' => (int) $latest->source_message_id,
            ];
        }

        $fake = new TelegramMessageMap([
            'ticket_id' => null,
            'source_chat_id' => (string) $userId,
            'source_message_id' => 0,
        ]);

        return [
            'map' => $fake,
            'user_chat_id' => (string) $userId,
            'reply_to_user_message_id' => 0,
        ];
    }

    /** @param  array<string, mixed>  $message */
    private function deliverMapped(
        TelegramBot $bot,
        TelegramMessageMap $map,
        array $message,
        string $groupChatId,
        int $adminMessageId,
        string $userChatId,
        int $replyToUserMessageId,
    ): void {
        $text = trim((string) ($message['text'] ?? $message['caption'] ?? ''));
        $hasMedia = isset($message['photo'])
            || isset($message['document'])
            || isset($message['video'])
            || isset($message['voice'])
            || isset($message['audio'])
            || isset($message['sticker']);

        if ($text === '' && ! $hasMedia) {
            return;
        }

        if ($map->ticket_id && $text !== '') {
            TicketMessage::query()->create([
                'ticket_id' => $map->ticket_id,
                'message' => $text,
                'is_admin_reply' => true,
            ]);
        }

        $client = $this->clients->forBot($bot);
        $deliverOptions = ['parse_mode' => 'HTML'];
        if ($replyToUserMessageId > 0) {
            $deliverOptions['reply_to_message_id'] = $replyToUserMessageId;
            $deliverOptions['allow_sending_without_reply'] = true;
        }

        try {
            if ($hasMedia) {
                $delivered = $client->copyMessage($userChatId, $groupChatId, $adminMessageId, [
                    ...$deliverOptions,
                    'caption' => $this->formatSupportCaption($text !== '' ? $text : null),
                ]);
            } else {
                try {
                    $delivered = $client->sendMessage($userChatId, $this->formatSupportReply($text), $deliverOptions);
                } catch (Throwable) {
                    unset($deliverOptions['reply_to_message_id'], $deliverOptions['allow_sending_without_reply']);
                    $delivered = $client->sendMessage($userChatId, $this->formatSupportReply($text), $deliverOptions);
                }
            }

            $deliveredId = (int) ($delivered['message_id'] ?? 0);
            if ($deliveredId > 0 && $map->ticket_id) {
                // media_group_id stores the private user message this answer replied to.
                $this->bridge->mapSupportThreadToUser(
                    (int) $map->ticket_id,
                    $groupChatId,
                    $adminMessageId,
                    $userChatId,
                    $deliveredId,
                    $map->target_thread_id ? (int) $map->target_thread_id : null,
                    $replyToUserMessageId > 0 ? $replyToUserMessageId : null,
                );
            }

            $this->bridge->reactConfirm($client, $groupChatId, $adminMessageId);
        } catch (Throwable) {
            // Swallow — do not spam the reports group.
        }
    }

    private function formatSupportReply(string $text): string
    {
        return TelegramHtml::bold('🎫 پاسخ پشتیبانی')
            ."\n"
            .'────────────────'
            ."\n"
            .TelegramHtml::escape($text)
            ."\n\n"
            .'<i>'.TelegramHtml::escape('برای پاسخ، روی همین پیام Reply بزنید.').'</i>';
    }

    private function formatSupportCaption(?string $text): string
    {
        $header = TelegramHtml::bold('🎫 پاسخ پشتیبانی');
        $hint = "\n\n".'<i>'.TelegramHtml::escape('برای پاسخ، روی همین پیام Reply بزنید.').'</i>';
        if ($text === null || $text === '') {
            return $header.$hint;
        }

        return $header."\n".TelegramHtml::escape($text).$hint;
    }

    private function extractTelegramUserId(string $text): ?int
    {
        if (preg_match('/(?:^|\n)(\d{5,15})\s*$/u', trim($text), $m)) {
            return (int) $m[1];
        }

        if (preg_match('/^(\d{5,15})$/u', trim($text), $m)) {
            return (int) $m[1];
        }

        return null;
    }
}
