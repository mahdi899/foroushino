<?php

namespace App\Http\Controllers\Api\V1\Misc;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\AppNotificationResource;
use App\Models\AppNotification;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user()->appNotifications()
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        return ApiResponse::success(AppNotificationResource::collection($notifications));
    }

    public function markRead(Request $request, AppNotification $notification): JsonResponse
    {
        abort_if($notification->user_id !== $request->user()->id, 403);

        $notification->update(['read' => true]);

        return ApiResponse::success(new AppNotificationResource($notification));
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->appNotifications()->where('read', false)->update(['read' => true]);

        return ApiResponse::success(message: 'همه اعلان‌ها خوانده شد');
    }
}
