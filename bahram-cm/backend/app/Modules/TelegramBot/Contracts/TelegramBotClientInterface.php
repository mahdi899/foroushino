<?php

namespace App\Modules\TelegramBot\Contracts;

use App\Modules\TelegramBot\Exceptions\TelegramApiException;

/**
 * Thin wrapper around the subset of the Telegram Bot API this module needs.
 * Every method returns the decoded `result` field of a successful response
 * (array, or bool for a handful of Telegram methods that just return true).
 *
 * Implementations MUST throw TelegramApiException (or the
 * TelegramRateLimitException subclass for HTTP 429) on failure — callers
 * never need to inspect a raw `ok: false` payload themselves.
 *
 * @throws TelegramApiException
 */
interface TelegramBotClientInterface
{
    /**
     * @param  array<string, mixed>  $options  Additional setWebhook params (allowed_updates, max_connections, …)
     * @return array<string, mixed>|bool
     */
    public function setWebhook(string $url, ?string $secretToken = null, array $options = []): array|bool;

    /** @return array<string, mixed>|bool */
    public function deleteWebhook(bool $dropPendingUpdates = false): array|bool;

    /** @return array<string, mixed> */
    public function getWebhookInfo(): array;

    /**
     * Long-polling for local development (requires webhook to be deleted first).
     *
     * @param  array<string, mixed>  $options  offset, limit, timeout, allowed_updates
     * @return list<array<string, mixed>>
     */
    public function getUpdates(array $options = []): array;

    /** @return array<string, mixed> */
    public function getMe(): array;

    /**
     * @param  array<string, mixed>  $options  parse_mode, reply_markup, reply_to_message_id, …
     * @return array<string, mixed>
     */
    public function sendMessage(int|string $chatId, string $text, array $options = []): array;

    /**
     * @param  array<string, mixed>  $options
     * @return array<string, mixed>
     */
    public function sendSticker(int|string $chatId, string $sticker, array $options = []): array;

    /** @param  array<string, mixed>  $options
     * @return array<string, mixed> */
    public function sendPhoto(int|string $chatId, string $photo, array $options = []): array;

    /** @param  array<string, mixed>  $options
     * @return array<string, mixed> */
    public function sendVideo(int|string $chatId, string $video, array $options = []): array;

    /** @param  array<string, mixed>  $options
     * @return array<string, mixed> */
    public function sendAudio(int|string $chatId, string $audio, array $options = []): array;

    /** @param  array<string, mixed>  $options
     * @return array<string, mixed> */
    public function sendVoice(int|string $chatId, string $voice, array $options = []): array;

    /** @param  array<string, mixed>  $options
     * @param  string|array{content: string, filename?: string}  $document
     * @return array<string, mixed> */
    public function sendDocument(int|string $chatId, string|array $document, array $options = []): array;

    /** @param  array<string, mixed>  $options
     * @return array<string, mixed> */
    public function copyMessage(int|string $chatId, int|string $fromChatId, int $messageId, array $options = []): array;

    /** @param  array<string, mixed>  $options
     * @return array<string, mixed> */
    public function forwardMessage(int|string $chatId, int|string $fromChatId, int $messageId, array $options = []): array;

    /**
     * @param  list<array{type: string, emoji?: string}>  $reaction
     */
    public function setMessageReaction(int|string $chatId, int $messageId, array $reaction = [['type' => 'emoji', 'emoji' => '✅']]): bool;

    /**
     * @param  array<string, mixed>  $options  Must include chat_id+message_id OR inline_message_id.
     * @return array<string, mixed>|bool
     */
    public function editMessageText(string $text, array $options = []): array|bool;

    /**
     * @param  array<string, mixed>  $options  Must include chat_id+message_id OR inline_message_id.
     * @return array<string, mixed>|bool
     */
    public function editMessageCaption(array $options = []): array|bool;

    /**
     * @param  array<string, mixed>  $options  Must include chat_id+message_id OR inline_message_id.
     * @return array<string, mixed>|bool
     */
    public function editMessageReplyMarkup(array $options = []): array|bool;

    public function deleteMessage(int|string $chatId, int $messageId): bool;

    /** @param  array<string, mixed>  $options  text, show_alert, url, cache_time */
    public function answerCallbackQuery(string $callbackQueryId, array $options = []): bool;

    /** @return array<string, mixed> */
    public function getChatMember(int|string $chatId, int $userId): array;

    /** @return array<string, mixed> */
    public function getChat(int|string $chatId): array;

    /** @return list<array<string, mixed>> */
    public function getChatAdministrators(int|string $chatId): array;

    public function approveChatJoinRequest(int|string $chatId, int $userId): bool;

    public function declineChatJoinRequest(int|string $chatId, int $userId): bool;

    /** @param  array<string, mixed>  $options  until_date, revoke_messages */
    public function banChatMember(int|string $chatId, int $userId, array $options = []): bool;

    /** @param  array<string, mixed>  $options  only_if_banned */
    public function unbanChatMember(int|string $chatId, int $userId, array $options = []): bool;

    /**
     * @param  array<string, mixed>  $options  name, expire_date, member_limit, creates_join_request
     * @return array<string, mixed>
     */
    public function createChatInviteLink(int|string $chatId, array $options = []): array;

    /** @return array<string, mixed> */
    public function revokeChatInviteLink(int|string $chatId, string $inviteLink): array;

    public function sendChatAction(int|string $chatId, string $action): bool;

    /** @return array<string, mixed>|bool */
    public function setMyName(string $name, ?string $languageCode = null): array|bool;

    /** @return array<string, mixed> */
    public function getMyName(?string $languageCode = null): array;

    /** @return array<string, mixed>|bool */
    public function setMyDescription(?string $description, ?string $languageCode = null): array|bool;

    /** @return array<string, mixed> */
    public function getMyDescription(?string $languageCode = null): array;

    /** @return array<string, mixed>|bool */
    public function setMyShortDescription(?string $shortDescription, ?string $languageCode = null): array|bool;

    /** @return array<string, mixed> */
    public function getMyShortDescription(?string $languageCode = null): array;

    /**
     * Set the bot's static profile photo from a local JPG (or convertible image) path.
     *
     * @return array<string, mixed>|bool
     */
    public function setMyProfilePhoto(string $localFilePath): array|bool;

    /** @return array<string, mixed>|bool */
    public function removeMyProfilePhoto(): array|bool;

    /**
     * @return array<string, mixed>
     */
    public function getUserProfilePhotos(int $userId, ?int $offset = null, ?int $limit = null): array;

    /**
     * @return array<string, mixed>
     */
    public function getFile(string $fileId): array;

    /**
     * Download a file previously resolved via getFile (uses file_path from Telegram).
     * Returns raw bytes; never logs the tokenized download URL.
     */
    public function downloadFile(string $filePath): string;

    /**
     * Free custom emoji stickers allowed as forum topic icons (valid custom_emoji_id values).
     *
     * @return list<array<string, mixed>>
     */
    public function getForumTopicIconStickers(): array;

    /**
     * Resolve sticker metadata for known custom emoji ids.
     *
     * @param  list<string>  $customEmojiIds
     * @return list<array<string, mixed>>
     */
    public function getCustomEmojiStickers(array $customEmojiIds): array;
}
