<?php

namespace App\Services\Family;

use App\Enums\InAppNotificationType;
use App\Events\FamilyNotificationCreated;
use App\Jobs\Family\SendFamilyUserPushJob;
use App\Models\User;
use App\Services\InAppNotificationService;
use App\Support\FamilySiteUrl;
use App\Support\SafeBroadcast;

class FamilyNotificationService
{
    public function __construct(
        private readonly InAppNotificationService $notifications,
    ) {}

    public function commentApproved(User $user, int $postId): void
    {
        $this->notify(
            $user,
            'نظر شما تأیید شد',
            'نظر شما در خانواده داداش بهرام منتشر شد.',
            InAppNotificationType::FamilyCommentApproved,
            FamilySiteUrl::postUrl($postId),
            'مشاهده پست',
        );
    }

    public function commentRejected(User $user, string $reasonLabel): void
    {
        $this->notify(
            $user,
            'نظر شما منتشر نشد',
            "دلیل:\n{$reasonLabel}",
            InAppNotificationType::FamilyCommentRejected,
            FamilySiteUrl::notificationsUrl(),
            'مشاهده جزئیات',
        );
    }

    public function bahramReplied(User $user, int $postId): void
    {
        $title = 'بهرام به نظرت پاسخ داد';
        $body = 'پاسخ بهرام را در خانواده ببین.';
        $link = FamilySiteUrl::postUrl($postId);

        $this->notify(
            $user,
            $title,
            $body,
            InAppNotificationType::FamilyBahramReplied,
            $link,
            'مشاهده پاسخ',
        );

        // Real device push (badge/toast above only covers the open tab) — queued
        // so this single-user send never blocks the reply request.
        SendFamilyUserPushJob::dispatch($user->id, [
            'title' => $title,
            'body' => $body,
            'url' => $link,
            'tag' => 'family-bahram-replied-'.$postId,
        ]);
    }

    public function actionFollowUp(User $user, string $message): void
    {
        $this->notify(
            $user,
            'یادآوری تمرین',
            $message,
            InAppNotificationType::FamilyActionFollowUp,
            FamilySiteUrl::homeUrl(),
            'باز کردن خانواده',
        );
    }

    public function importantPost(User $user, int $postId, string $title = 'پیام مهم از بهرام'): void
    {
        $this->notify(
            $user,
            $title,
            'یک پیام مهم جدید در خانواده منتشر شده است.',
            InAppNotificationType::FamilyImportantPost,
            FamilySiteUrl::postUrl($postId),
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
