<?php

namespace App\Http\Controllers\Api\V1\Family;

use App\Enums\InAppNotificationType;
use App\Http\Controllers\Api\V1\Student\NotificationController as StudentNotificationController;
use App\Models\NotificationRecipient;
use App\Support\ApiResponse;
use App\Support\FamilySiteUrl;
use App\Support\NotificationRecipientQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class NotificationController extends StudentNotificationController
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->input('per_page', 50), 1), 100);

        $query = NotificationRecipientQuery::forUser($request->user(), 'family');

        if ($request->boolean('unread_only')) {
            $query->whereNull('read_at');
        }

        $recipients = $query->paginate($perPage);

        return ApiResponse::success(
            $recipients->getCollection()->map(fn (NotificationRecipient $recipient) => $this->payload($recipient)),
            meta: [
                'current_page' => $recipients->currentPage(),
                'last_page' => $recipients->lastPage(),
                'per_page' => $recipients->perPage(),
                'total' => $recipients->total(),
            ],
        );
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $count = Cache::remember(
            self::unreadCountCacheKey((int) $request->user()->id, 'family'),
            self::UNREAD_COUNT_TTL_SECONDS,
            fn () => NotificationRecipientQuery::forUser($request->user(), 'family')
                ->whereNull('read_at')
                ->count(),
        );

        return ApiResponse::success(['unread_count' => $count]);
    }

    public function markRead(Request $request, NotificationRecipient $notification): JsonResponse
    {
        abort_unless($notification->user_id === $request->user()->id, 403);
        $notification->loadMissing('notification');
        abort_unless(
            str_starts_with((string) $notification->notification?->type, 'family_'),
            404,
        );

        return parent::markRead($request, $notification);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $updated = NotificationRecipientQuery::forUser($request->user(), 'family')
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        self::forgetUnreadCount((int) $request->user()->id);

        return ApiResponse::success(['marked_count' => $updated]);
    }

    /** @return array<string, mixed> */
    protected function payload(NotificationRecipient $recipient): array
    {
        return [
            'id' => $recipient->id,
            'title' => $recipient->notification->title,
            'body' => $recipient->notification->body,
            'type' => $recipient->notification->type,
            'link' => filled($recipient->notification->link)
                ? FamilySiteUrl::absolute($recipient->notification->link)
                : null,
            'link_label' => $recipient->notification->link_label,
            'read_at' => $recipient->read_at?->toIso8601String(),
            'created_at' => $recipient->created_at?->toIso8601String(),
            'show_toast' => filled($recipient->notification->created_by)
                || InAppNotificationType::showsToastFor($recipient->notification->type),
        ];
    }
}
