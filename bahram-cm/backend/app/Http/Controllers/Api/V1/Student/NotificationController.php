<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\NotificationRecipient;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->input('per_page', 50), 1), 100);

        $query = $request->user()->notificationRecipients()
            ->with('notification')
            ->orderByDesc('id');

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
        $count = $request->user()->notificationRecipients()
            ->whereNull('read_at')
            ->count();

        return ApiResponse::success(['unread_count' => $count]);
    }

    public function markRead(Request $request, NotificationRecipient $notification): JsonResponse
    {
        abort_unless($notification->user_id === $request->user()->id, 403);

        if ($notification->read_at === null) {
            $notification->update(['read_at' => now()]);
        }

        return ApiResponse::success(['read_at' => $notification->read_at?->toIso8601String()]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $updated = $request->user()->notificationRecipients()
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return ApiResponse::success(['marked_count' => $updated]);
    }

    /** @return array<string, mixed> */
    private function payload(NotificationRecipient $recipient): array
    {
        return [
            'id' => $recipient->id,
            'title' => $recipient->notification->title,
            'body' => $recipient->notification->body,
            'type' => $recipient->notification->type,
            'link' => $recipient->notification->link,
            'read_at' => $recipient->read_at?->toIso8601String(),
            'created_at' => $recipient->created_at?->toIso8601String(),
            'show_toast' => filled($recipient->notification->created_by),
        ];
    }
}
