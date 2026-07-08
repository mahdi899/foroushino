<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Http\Requests\Student\StoreTicketMessageRequest;
use App\Http\Requests\Student\StoreTicketRequest;
use App\Models\Ticket;
use App\Support\ApiResponse;
use App\Services\InAppNotificationService;
use App\Services\SmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TicketController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tickets = $request->user()->tickets()->orderByDesc('id')->get();

        return ApiResponse::success($tickets->map(fn (Ticket $ticket) => [
            'id' => $ticket->id,
            'subject' => $ticket->subject,
            'department' => $ticket->department,
            'status' => $ticket->status->value,
            'priority' => $ticket->priority->value,
            'created_at' => $ticket->created_at?->toIso8601String(),
        ]));
    }

    public function show(Request $request, Ticket $ticket): JsonResponse
    {
        $this->authorizeOwnership($request, $ticket);
        $ticket->load('messages');

        return ApiResponse::success($this->payload($ticket));
    }

    public function store(StoreTicketRequest $request): JsonResponse
    {
        $user = $request->user();

        $ticket = $user->tickets()->create([
            'department' => $request->input('department'),
            'subject' => $request->string('subject'),
            'status' => 'open',
            'priority' => 'normal',
        ]);

        $ticket->messages()->create([
            'user_id' => $user->id,
            'message' => $request->string('message'),
            'attachment_path' => $this->storeAttachment($request),
            'is_admin_reply' => false,
        ]);

        $ticket->load('messages');

        app(SmsService::class)->sendTicketCreated($ticket);
        app(InAppNotificationService::class)->ticketCreated($ticket->loadMissing('user'));

        return ApiResponse::success($this->payload($ticket), 201);
    }

    public function storeMessage(StoreTicketMessageRequest $request, Ticket $ticket): JsonResponse
    {
        $this->authorizeOwnership($request, $ticket);

        if ($ticket->status->value === 'closed') {
            return ApiResponse::error('ticket_closed', 'این تیکت بسته شده است.', 422);
        }

        $ticket->messages()->create([
            'user_id' => $request->user()->id,
            'message' => $request->string('message'),
            'attachment_path' => $this->storeAttachment($request),
            'is_admin_reply' => false,
        ]);

        $ticket->update(['status' => 'open']);
        $ticket->load('messages');

        return ApiResponse::success($this->payload($ticket));
    }

    private function authorizeOwnership(Request $request, Ticket $ticket): void
    {
        abort_unless($ticket->user_id === $request->user()->id, 403);
    }

    private function storeAttachment(Request $request): ?string
    {
        if (! $request->hasFile('attachment')) {
            return null;
        }

        return $request->file('attachment')->store('tickets', 'local');
    }

    /** @return array<string, mixed> */
    private function payload(Ticket $ticket): array
    {
        return [
            'id' => $ticket->id,
            'subject' => $ticket->subject,
            'department' => $ticket->department,
            'status' => $ticket->status->value,
            'priority' => $ticket->priority->value,
            'created_at' => $ticket->created_at?->toIso8601String(),
            'messages' => $ticket->messages->map(fn ($m) => [
                'id' => $m->id,
                'message' => $m->message,
                'has_attachment' => filled($m->attachment_path),
                'is_admin_reply' => $m->is_admin_reply,
                'created_at' => $m->created_at?->toIso8601String(),
            ]),
        ];
    }
}
