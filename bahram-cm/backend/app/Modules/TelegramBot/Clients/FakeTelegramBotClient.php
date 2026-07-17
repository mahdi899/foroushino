<?php

namespace App\Modules\TelegramBot\Clients;

use App\Modules\TelegramBot\Contracts\TelegramBotClientInterface;

/**
 * In-memory fake used in tests. Records every call (method + arguments) so
 * assertions can be made without hitting the real Telegram API, and allows
 * queueing canned responses per method for scenarios that need one.
 */
class FakeTelegramBotClient implements TelegramBotClientInterface
{
    /** @var list<array{method: string, arguments: array<string, mixed>}> */
    public array $calls = [];

    /** @var array<string, list<mixed>> */
    private array $queuedResponses = [];

    private int $lastMessageId = 1000;

    /**
     * Queue a canned return value for the next call to $method (FIFO).
     */
    public function queueResponse(string $method, mixed $response): static
    {
        $this->queuedResponses[$method][] = $response;

        return $this;
    }

    public function calledMethods(): array
    {
        return array_map(static fn (array $call) => $call['method'], $this->calls);
    }

    public function wasCalled(string $method): bool
    {
        return in_array($method, $this->calledMethods(), true);
    }

    public function callCount(string $method): int
    {
        return count(array_filter($this->calls, static fn (array $call) => $call['method'] === $method));
    }

    public function setWebhook(string $url, ?string $secretToken = null, array $options = []): array|bool
    {
        return $this->record('setWebhook', ['url' => $url, 'secret_token' => $secretToken, 'options' => $options], true);
    }

    public function deleteWebhook(bool $dropPendingUpdates = false): array|bool
    {
        return $this->record('deleteWebhook', ['drop_pending_updates' => $dropPendingUpdates], true);
    }

    public function getWebhookInfo(): array
    {
        return (array) $this->record('getWebhookInfo', [], ['url' => '', 'has_custom_certificate' => false, 'pending_update_count' => 0]);
    }

    /** @return list<array<string, mixed>> */
    public function getUpdates(array $options = []): array
    {
        return (array) $this->record('getUpdates', ['options' => $options], []);
    }

    public function getMe(): array
    {
        return (array) $this->record('getMe', [], ['id' => 0, 'is_bot' => true, 'first_name' => 'Fake Bot', 'username' => 'fake_bot']);
    }

    public function sendMessage(int|string $chatId, string $text, array $options = []): array
    {
        return (array) $this->record('sendMessage', ['chat_id' => $chatId, 'text' => $text, 'options' => $options], ['message_id' => $this->nextMessageId()]);
    }

    public function sendPhoto(int|string $chatId, string $photo, array $options = []): array
    {
        return (array) $this->record('sendPhoto', ['chat_id' => $chatId, 'photo' => $photo, 'options' => $options], ['message_id' => $this->nextMessageId()]);
    }

    public function sendVideo(int|string $chatId, string $video, array $options = []): array
    {
        return (array) $this->record('sendVideo', ['chat_id' => $chatId, 'video' => $video, 'options' => $options], ['message_id' => $this->nextMessageId()]);
    }

    public function sendAudio(int|string $chatId, string $audio, array $options = []): array
    {
        return (array) $this->record('sendAudio', ['chat_id' => $chatId, 'audio' => $audio, 'options' => $options], ['message_id' => $this->nextMessageId()]);
    }

    public function sendVoice(int|string $chatId, string $voice, array $options = []): array
    {
        return (array) $this->record('sendVoice', ['chat_id' => $chatId, 'voice' => $voice, 'options' => $options], ['message_id' => $this->nextMessageId()]);
    }

    public function sendDocument(int|string $chatId, string $document, array $options = []): array
    {
        return (array) $this->record('sendDocument', ['chat_id' => $chatId, 'document' => $document, 'options' => $options], ['message_id' => $this->nextMessageId()]);
    }

    public function copyMessage(int|string $chatId, int|string $fromChatId, int $messageId, array $options = []): array
    {
        return (array) $this->record('copyMessage', compact('chatId', 'fromChatId', 'messageId', 'options'), ['message_id' => $this->nextMessageId()]);
    }

    public function forwardMessage(int|string $chatId, int|string $fromChatId, int $messageId, array $options = []): array
    {
        return (array) $this->record('forwardMessage', compact('chatId', 'fromChatId', 'messageId', 'options'), ['message_id' => $this->nextMessageId()]);
    }

    public function editMessageText(string $text, array $options = []): array|bool
    {
        return $this->record('editMessageText', ['text' => $text, 'options' => $options], true);
    }

    public function editMessageCaption(array $options = []): array|bool
    {
        return $this->record('editMessageCaption', ['options' => $options], true);
    }

    public function editMessageReplyMarkup(array $options = []): array|bool
    {
        return $this->record('editMessageReplyMarkup', ['options' => $options], true);
    }

    public function deleteMessage(int|string $chatId, int $messageId): bool
    {
        return (bool) $this->record('deleteMessage', compact('chatId', 'messageId'), true);
    }

    public function answerCallbackQuery(string $callbackQueryId, array $options = []): bool
    {
        return (bool) $this->record('answerCallbackQuery', ['callback_query_id' => $callbackQueryId, 'options' => $options], true);
    }

    public function getChatMember(int|string $chatId, int $userId): array
    {
        return (array) $this->record('getChatMember', compact('chatId', 'userId'), ['status' => 'member']);
    }

    public function getChat(int|string $chatId): array
    {
        return (array) $this->record('getChat', compact('chatId'), [
            'id' => -1001234567890,
            'type' => 'channel',
            'username' => 'fake_channel',
        ]);
    }

    public function getChatAdministrators(int|string $chatId): array
    {
        $result = $this->record('getChatAdministrators', compact('chatId'), []);

        return is_array($result) ? $result : [];
    }

    public function approveChatJoinRequest(int|string $chatId, int $userId): bool
    {
        return (bool) $this->record('approveChatJoinRequest', compact('chatId', 'userId'), true);
    }

    public function declineChatJoinRequest(int|string $chatId, int $userId): bool
    {
        return (bool) $this->record('declineChatJoinRequest', compact('chatId', 'userId'), true);
    }

    public function banChatMember(int|string $chatId, int $userId, array $options = []): bool
    {
        return (bool) $this->record('banChatMember', compact('chatId', 'userId', 'options'), true);
    }

    public function unbanChatMember(int|string $chatId, int $userId, array $options = []): bool
    {
        return (bool) $this->record('unbanChatMember', compact('chatId', 'userId', 'options'), true);
    }

    public function createChatInviteLink(int|string $chatId, array $options = []): array
    {
        return (array) $this->record('createChatInviteLink', compact('chatId', 'options'), ['invite_link' => 'https://t.me/+fake']);
    }

    public function revokeChatInviteLink(int|string $chatId, string $inviteLink): array
    {
        return (array) $this->record('revokeChatInviteLink', ['chatId' => $chatId, 'inviteLink' => $inviteLink], ['invite_link' => $inviteLink, 'is_revoked' => true]);
    }

    public function sendChatAction(int|string $chatId, string $action): bool
    {
        return (bool) $this->record('sendChatAction', compact('chatId', 'action'), true);
    }

    public function setMyName(string $name, ?string $languageCode = null): array|bool
    {
        return (bool) $this->record('setMyName', compact('name', 'languageCode'), true);
    }

    public function getMyName(?string $languageCode = null): array
    {
        return (array) $this->record('getMyName', compact('languageCode'), ['name' => 'Fake Bot']);
    }

    public function setMyDescription(?string $description, ?string $languageCode = null): array|bool
    {
        return (bool) $this->record('setMyDescription', compact('description', 'languageCode'), true);
    }

    public function getMyDescription(?string $languageCode = null): array
    {
        return (array) $this->record('getMyDescription', compact('languageCode'), ['description' => '']);
    }

    public function setMyShortDescription(?string $shortDescription, ?string $languageCode = null): array|bool
    {
        return (bool) $this->record('setMyShortDescription', compact('shortDescription', 'languageCode'), true);
    }

    public function getMyShortDescription(?string $languageCode = null): array
    {
        return (array) $this->record('getMyShortDescription', compact('languageCode'), ['short_description' => '']);
    }

    public function setMyProfilePhoto(string $localFilePath): array|bool
    {
        return (bool) $this->record('setMyProfilePhoto', compact('localFilePath'), true);
    }

    public function removeMyProfilePhoto(): array|bool
    {
        return (bool) $this->record('removeMyProfilePhoto', [], true);
    }

    public function getUserProfilePhotos(int $userId, ?int $offset = null, ?int $limit = null): array
    {
        return (array) $this->record('getUserProfilePhotos', compact('userId', 'offset', 'limit'), [
            'total_count' => 0,
            'photos' => [],
        ]);
    }

    public function getFile(string $fileId): array
    {
        return (array) $this->record('getFile', compact('fileId'), [
            'file_id' => $fileId,
            'file_unique_id' => 'fake',
            'file_path' => 'photos/file_0.jpg',
        ]);
    }

    public function downloadFile(string $filePath): string
    {
        return (string) $this->record('downloadFile', compact('filePath'), '');
    }

    /** @param  array<string, mixed>  $arguments */
    private function record(string $method, array $arguments, mixed $default): mixed
    {
        $this->calls[] = ['method' => $method, 'arguments' => $arguments];

        if (! empty($this->queuedResponses[$method])) {
            return array_shift($this->queuedResponses[$method]);
        }

        return $default;
    }

    private function nextMessageId(): int
    {
        return ++$this->lastMessageId;
    }
}
