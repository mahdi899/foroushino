<?php

namespace App\Enums;

enum OrderCancellationReason: string
{
    case ReplacedCheckout = 'replaced_checkout';
    case ExpiredTtl = 'expired_ttl';
    case Admin = 'admin';
    case UserCancel = 'user_cancel';
    case AdminRejected = 'admin_rejected';
    case PaymentLinkRevoked = 'payment_link_revoked';
    case System = 'system';

    public function notifyCustomer(): bool
    {
        return match ($this) {
            self::ReplacedCheckout, self::UserCancel => false,
            default => true,
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::ReplacedCheckout => 'جایگزینی با سفارش جدید',
            self::ExpiredTtl => 'انقضای مهلت پرداخت',
            self::Admin => 'لغو توسط ادمین',
            self::UserCancel => 'انصراف کاربر',
            self::AdminRejected => 'رد رسید کارت‌به‌کارت',
            self::PaymentLinkRevoked => 'ابطال لینک پرداخت',
            self::System => 'خطای سیستم',
        };
    }
}
