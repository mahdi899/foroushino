<?php

namespace App\Modules\TelegramBot\Enums;

enum ConversationState: string
{
    case Idle = 'idle';
    case WaitingForTerms = 'waiting_for_terms';
    case WaitingForName = 'waiting_for_name';
    case WaitingForMobile = 'waiting_for_mobile';
    case ConfirmingRegistration = 'confirming_registration';
    case WaitingForOtp = 'waiting_for_otp';
    case WaitingForDiscountCode = 'waiting_for_discount_code';
    case WaitingForCardToCardReceipt = 'waiting_for_card_to_card_receipt';
    case FillingSatApplication = 'filling_sat_application';
    case FillingSeminarAttendees = 'filling_seminar_attendees';
    case WaitingForSupportCategory = 'waiting_for_support_category';
    case WaitingForSupportMessage = 'waiting_for_support_message';
    case WaitingForCompanionName = 'waiting_for_companion_name';
    case WaitingForCompanionMobile = 'waiting_for_companion_mobile';
    case AdminPanel = 'admin_panel';
    case AdminWaitingInput = 'admin_waiting_input';

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
