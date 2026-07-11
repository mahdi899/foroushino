<?php

namespace App\Enums;

enum InAppNotificationType: string
{
    case Welcome = 'welcome';
    case General = 'general';
    case OrderPaid = 'order_paid';
    case LicenseReady = 'license_ready';
    case MiniCourseEnrolled = 'mini_course_enrolled';
    case TicketCreated = 'ticket_created';
    case TicketReply = 'ticket_reply';
    case ProductNew = 'product_new';
    case ArticleNew = 'article_new';
    case IdentityApproved = 'identity_approved';
    case IdentityRejected = 'identity_rejected';
    case IdentityNeedsCorrection = 'identity_needs_correction';

    public function showsToast(): bool
    {
        return match ($this) {
            self::Welcome,
            self::OrderPaid,
            self::LicenseReady,
            self::MiniCourseEnrolled,
            self::TicketReply,
            self::IdentityApproved,
            self::IdentityRejected,
            self::IdentityNeedsCorrection => true,
            default => false,
        };
    }

    public static function showsToastFor(?string $type): bool
    {
        if (! filled($type)) {
            return false;
        }

        return self::tryFrom($type)?->showsToast() ?? false;
    }
}
