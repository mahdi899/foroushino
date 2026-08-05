<?php

namespace App\Enums;

enum TicketStatus: string
{
    case Open = 'open';
    case InReview = 'in_review';
    case Answered = 'answered';
    case WaitingUser = 'waiting_user';
    case Closed = 'closed';

    public function label(): string
    {
        return match ($this) {
            self::Open => 'باز',
            self::InReview => 'در حال بررسی',
            self::Answered => 'پاسخ داده شده',
            self::WaitingUser => 'در انتظار پاسخ کاربر',
            self::Closed => 'بسته شده',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn ($c) => $c->value, self::cases());
    }

    /**
     * Active tickets still being handled (not closed).
     *
     * @return list<string>
     */
    public static function openQueueValues(): array
    {
        return [
            self::Open->value,
            self::InReview->value,
            self::Answered->value,
            self::WaitingUser->value,
        ];
    }
}
