<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Services\AudienceSegmentService;
use App\Services\InAppNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class NotificationAdminController extends Controller
{
    public function __construct(
        private readonly AudienceSegmentService $segments,
        private readonly InAppNotificationService $notifications,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $notifications = Notification::query()->withCount('recipients')->orderByDesc('id')
            ->paginate((int) $request->input('per_page', 30));

        return response()->json([
            'data' => $notifications->getCollection()->map(fn (Notification $n) => [
                'id' => $n->id,
                'title' => $n->title,
                'body' => $n->body,
                'type' => $n->type,
                'link' => $n->link,
                'link_label' => $n->link_label,
                'recipients_count' => $n->recipients_count,
                'created_at' => $n->created_at?->toIso8601String(),
            ]),
            'meta' => ['current_page' => $notifications->currentPage(), 'last_page' => $notifications->lastPage(), 'total' => $notifications->total()],
        ]);
    }

    /** Compose and broadcast an in-app notification to a segment of students. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:2000'],
            'type' => ['nullable', 'string', 'max:50'],
            'link' => ['nullable', 'required_with:link_label', 'string', 'max:500'],
            'link_label' => ['nullable', 'string', 'max:80'],
            'segment' => ['required', 'string', Rule::in(array_keys(AudienceSegmentService::SEGMENTS))],
        ]);

        $link = filled($data['link'] ?? null) ? trim($data['link']) : null;

        if ($link !== null && ! preg_match('#^(https?://|/)#i', $link)) {
            throw ValidationException::withMessages([
                'link' => ['لینک باید با / یا http:// یا https:// شروع شود.'],
            ]);
        }

        $linkLabel = filled($link) && filled($data['link_label'] ?? null)
            ? trim($data['link_label'])
            : null;

        $recipients = $this->segments->resolve($data['segment']);

        $notification = $this->notifications->notifyUsers(
            $recipients,
            $data['title'],
            $data['body'],
            $data['type'] ?? 'general',
            $link,
            $request->user()->id,
            $linkLabel,
        );

        return response()->json(['data' => [
            'id' => $notification->id,
            'recipients_count' => $recipients->count(),
        ]], 201);
    }
}
