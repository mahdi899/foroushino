<?php

namespace App\Services\Family;

use App\Enums\InAppNotificationType;
use App\Events\FamilyNotificationCreated;
use App\Models\User;
use App\Services\InAppNotificationService;
use App\Support\SafeBroadcast;

class FamilyNotificationService
{
    public function __construct(
        private readonly InAppNotificationService $notifications,
    ) {}

    public function commentApproved(User $user): void
    {
        $this->notify(
            $user,
            'نظر شما تأیید شد',
            'نظر شما در خانواده داداش بهرام منتشر شد.',
            InAppNotificationType::FamilyCommentApproved,
            '/family',
            'مشاهده خانواده',
        );
    }

    public function commentRejected(User $user, string $reasonLabel): void
    {
        $this->notify(
            $user,
            'نظر شما منتشر نشد',
            "دلیل:\n{$reasonLabel}",
            InAppNotificationType::FamilyCommentRejected,
            '/family/notifications',
            'مشاهده جزئیات',
        );
    }

    public function bahramReplied(User $user): void
    {
        $this->notify(
            $user,
            'بهرام به نظرت پاسخ داد',
            'پاسخ بهرام را در خانواده ببین.',
            InAppNotificationType::FamilyBahramReplied,
            '/family',
            'مشاهده پاسخ',
        );
    }

    public function actionFollowUp(User $user, string $message): void
    {
        $this->notify(
            $user,
            'یادآوری تمرین',
            $message,
            InAppNotificationType::FamilyActionFollowUp,
            '/family',
            'باز کردن خانواده',
        );
    }

    public function importantPost(User $user, string $title = 'پیام مهم از بهرام'): void
    {
        $this->notify(
            $user,
            $title,
            'یک پیام مهم جدید در خانواده منتشر شده است.',
            InAppNotificationType::FamilyImportantPost,
            '/family',
            'مشاهده',
        );
    }

    private function notify(
        User $user,
        string $title,
        string $body,
        InAppNotificationType $type,
        string $link,
        string $linkLabel,
    ): void {
        $this->notifications->notifyUser(
            $user,
            $title,
            $body,
            $type,
            $link,
            null,
            $linkLabel,
        );

        SafeBroadcast::optionally(
            fn () => broadcast(new FamilyNotificationCreated(
                $user->id,
                $title,
                $body,
                $type->value,
                $link,
            )),
        );
    }
}
