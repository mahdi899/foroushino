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
        $recipients = $request->user()->notificationRecipients()
            ->with('notification')
            ->orderByDesc('id')
            ->get();

        return ApiResponse::success($recipients->map(fn (NotificationRecipient $recipient) => [
            'id' => $recipient->id,
            'title' => $recipient->notification->title,
            'body' => $recipient->notification->body,
            'type' => $recipient->notification->type,
            'link' => $recipient->notification->link,
            'read_at' => $recipient->read_at?->toIso8601String(),
            'created_at' => $recipient->created_at?->toIso8601String(),
        ]));
    }

    public function markRead(Request $request, NotificationRecipient $notification): JsonResponse
    {
        abort_unless($notification->user_id === $request->user()->id, 403);

        if ($notification->read_at === null) {
            $notification->update(['read_at' => now()]);
        }

        return ApiResponse::success(['read_at' => $notification->read_at?->toIso8601String()]);
    }
}
