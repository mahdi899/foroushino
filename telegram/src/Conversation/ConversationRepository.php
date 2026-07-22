<?php

declare(strict_types=1);

namespace TelegramHost\Conversation;

/** Mirrors the state names in app/Modules/TelegramBot/Enums/ConversationState.php (subset used here). */
final class ConversationRepository
{
    public function __construct(private readonly \PDO $pdo) {}

    /** @return array{state: string, context: array<string, mixed>} */
    public function get(int $telegramUserId): array
    {
        $stmt = $this->pdo->prepare('SELECT state, context_json FROM conversations WHERE telegram_user_id = :id');
        $stmt->execute(['id' => $telegramUserId]);
        $row = $stmt->fetch();

        if ($row === false) {
            return ['state' => 'idle', 'context' => []];
        }

        $context = json_decode((string) $row['context_json'], true);

        return ['state' => (string) $row['state'], 'context' => is_array($context) ? $context : []];
    }

    /** @param array<string, mixed> $context */
    public function set(int $telegramUserId, string $state, array $context = []): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO conversations (telegram_user_id, state, context_json, updated_at) VALUES (:id, :state, :context, NOW())
             ON DUPLICATE KEY UPDATE state = :state2, context_json = :context2, updated_at = NOW()',
        );
        $json = json_encode($context, JSON_UNESCAPED_UNICODE);
        $stmt->execute(['id' => $telegramUserId, 'state' => $state, 'context' => $json, 'state2' => $state, 'context2' => $json]);
    }
}
