<?php

namespace App\Modules\TelegramBot\Enums;

enum UpdateType: string
{
    case Message = 'message';
    case EditedMessage = 'edited_message';
    case CallbackQuery = 'callback_query';
    case MyChatMember = 'my_chat_member';
    case ChatMember = 'chat_member';
    case ChatJoinRequest = 'chat_join_request';
    case Other = 'other';

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }

    /** @param  array<string, mixed>  $payload */
    public static function fromPayload(array $payload): self
    {
        foreach (self::cases() as $case) {
            if ($case !== self::Other && array_key_exists($case->value, $payload)) {
                return $case;
            }
        }

        return self::Other;
    }
}
