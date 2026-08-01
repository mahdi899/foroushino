<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Enums\InAppNotificationType;
use App\Http\Controllers\Controller;
use App\Models\NotificationRecipient;
use App\Services\InAppNotificationService;
use App\Support\ApiResponse;
use App\Support\NotificationRecipientQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class NotificationController extends Controller
{
    /** Panels poll this endpoint continuously; a short TTL keeps MySQL out of the hot path. */
    protected const UNREAD_COUNT_TTL_SECONDS = 20;

    /** Welcome dedupe writes to the DB, so run it at most once per user per hour. */
    private const DEDUPE_TTL_SECONDS = 3600;

    public function __construct(
        private readonly InAppNotificationService $notifications,
    ) {}

    public function index(Request $request): JsonResponse
    {
        // Collapse historical welcome spam (same bug as repeated first-login side effects).
        // Guarded by a cache lock: the panel polls this route every few seconds and the
        // dedupe is a write query that does not need to run on every poll.
        Cache::remember(
            'notifications:welcome-dedupe:'.$request->user()->id,
            self::DEDUPE_TTL_SECONDS,
            function () use ($request) {
                $this->notifications->dedupeWelcomeNotifications($request->user());

                return true;
            },
        );

        $perPage = min(max((int) $request->input('per_page', 50), 1), 100);

        $query = NotificationRecipientQuery::forUser($request->user(), 'student');

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
            self::unreadCountCacheKey((int) $request->user()->id, 'student'),
            self::UNREAD_COUNT_TTL_SECONDS,
            fn () => NotificationRecipientQuery::forUser($request->user(), 'student')
                ->whereNull('read_at')
                ->count(),
        );

        return ApiResponse::success(['unread_count' => $count]);
    }

    public function markRead(Request $request, NotificationRecipient $notification): JsonResponse
    {
        abort_unless($notification->user_id === $request->user()->id, 403);

        if ($notification->read_at === null) {
            $notification->update(['read_at' => now()]);
            self::forgetUnreadCount((int) $request->user()->id);
        }

        return ApiResponse::success(['read_at' => $notification->read_at?->toIso8601String()]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $updated = NotificationRecipientQuery::forUser($request->user(), 'student')
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        self::forgetUnreadCount((int) $request->user()->id);

        return ApiResponse::success(['marked_count' => $updated]);
    }

    protected static function unreadCountCacheKey(int $userId, string $scope): string
    {
        return "notifications:unread-count:{$scope}:{$userId}";
    }

    /** Drop both scopes — a recipient row can surface in the panel and in Club. */
    public static function forgetUnreadCount(int $userId): void
    {
        foreach (['student', 'family'] as $scope) {
            Cache::forget(self::unreadCountCacheKey($userId, $scope));
        }
    }

    /** @return array<string, mixed> */
    protected function payload(NotificationRecipient $recipient): array
    {
        return [
            'id' => $recipient->id,
            'title' => $recipient->notification->title,
            'body' => $recipient->notification->body,
            'type' => $recipient->notification->type,
            'link' => $recipient->notification->link,
            'link_label' => $recipient->notification->link_label,
            'read_at' => $recipient->read_at?->toIso8601String(),
            'created_at' => $recipient->created_at?->toIso8601String(),
            'show_toast' => filled($recipient->notification->created_by)
                || InAppNotificationType::showsToastFor($recipient->notification->type),
        ];
    }
}
