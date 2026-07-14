<?php

namespace App\Services\Family;

use App\Enums\InAppNotificationType;
use App\Models\User;
use App\Services\InAppNotificationService;

class FamilyNotificationService
{
    public function __construct(
        private readonly InAppNotificationService $notifications,
    ) {}

    public function commentApproved(User $user): void
    {
        $this->notifications->notifyUser(
            $user,
            'نظر شما تأیید شد',
            'نظر شما در خانواده داداش بهرام منتشر شد.',
            InAppNotificationType::FamilyCommentApproved,
            '/family',
            null,
            'مشاهده خانواده',
        );
    }

    public function commentRejected(User $user, string $reasonLabel): void
    {
        $this->notifications->notifyUser(
            $user,
            'نظر شما منتشر نشد',
            "دلیل:\n{$reasonLabel}",
            InAppNotificationType::FamilyCommentRejected,
            '/family/notifications',
            null,
            'مشاهده جزئیات',
        );
    }

    public function bahramReplied(User $user): void
    {
        $this->notifications->notifyUser(
            $user,
            'بهرام به نظرت پاسخ داد',
            'پاسخ بهرام را در خانواده ببین.',
            InAppNotificationType::FamilyBahramReplied,
            '/family',
            null,
            'مشاهده پاسخ',
        );
    }

    public function actionFollowUp(User $user, string $message): void
    {
        $this->notifications->notifyUser(
            $user,
            'یادآوری تمرین',
            $message,
            InAppNotificationType::FamilyActionFollowUp,
            '/family',
            null,
            'باز کردن خانواده',
        );
    }

    public function importantPost(User $user, string $title = 'پیام مهم از بهرام'): void
    {
        $this->notifications->notifyUser(
            $user,
            $title,
            'یک پیام مهم جدید در خانواده منتشر شده است.',
            InAppNotificationType::FamilyImportantPost,
            '/family',
            null,
            'مشاهده',
        );
    }
}
