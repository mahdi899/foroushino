<?php

namespace App\Modules\TelegramBot\Enums;

enum BotFeatureFlag: string
{
    case TicketRequiresSubscription = 'ticket_requires_subscription';
    case SupportRequiresSubscription = 'support_requires_subscription';
    case IranMobileOnly = 'iran_mobile_only';
    case CardToCardPayment = 'card_to_card_payment';
    case SmsOtpVerification = 'sms_otp_verification';
    case CollectPhoneAndName = 'collect_phone_and_name';
    case ReferralEnabled = 'referral_enabled';
    case ZarinpalPayment = 'zarinpal_payment';

    public function labelFa(): string
    {
        return match ($this) {
            self::TicketRequiresSubscription => 'شرط اشتراک تیکت',
            self::SupportRequiresSubscription => 'ارسال پیام پشتیبانی',
            self::IranMobileOnly => 'تایید شماره‌های فقط ایران',
            self::CardToCardPayment => 'پرداخت کارت به کارت',
            self::SmsOtpVerification => 'ارسال پیامک تایید',
            self::CollectPhoneAndName => 'دریافت شماره و نام',
            self::ReferralEnabled => 'زیرمجموعه‌گیری',
            self::ZarinpalPayment => 'پرداخت زرین‌پال (آنلاین)',
        };
    }

    public function defaultEnabled(): bool
    {
        return match ($this) {
            self::TicketRequiresSubscription => false,
            self::SupportRequiresSubscription => false,
            self::IranMobileOnly => true,
            self::CardToCardPayment => false,
            self::SmsOtpVerification => false,
            self::CollectPhoneAndName => true,
            self::ReferralEnabled => true,
            self::ZarinpalPayment => true,
        };
    }

    /** @return list<self> */
    public static function ordered(): array
    {
        return [
            self::TicketRequiresSubscription,
            self::SupportRequiresSubscription,
            self::IranMobileOnly,
            self::CardToCardPayment,
            self::SmsOtpVerification,
            self::CollectPhoneAndName,
            self::ReferralEnabled,
            self::ZarinpalPayment,
        ];
    }
}
