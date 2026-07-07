<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TicketAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Ticket::query()->with('user')->orderByDesc('id');

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        $tickets = $query->paginate((int) $request->input('per_page', 50));

        return response()->json([
            'data' => $tickets->getCollection()->map(fn (Ticket $t) => $this->listPayload($t)),
            'meta' => ['current_page' => $tickets->currentPage(), 'last_page' => $tickets->lastPage(), 'total' => $tickets->total()],
        ]);
    }

    public function show(Ticket $ticket): JsonResponse
    {
        $ticket->load(['user', 'messages']);

        return response()->json(['data' => [
            ...$this->listPayload($ticket),
            'messages' => $ticket->messages->map(fn ($m) => [
                'id' => $m->id,
                'message' => $m->message,
                'is_admin_reply' => $m->is_admin_reply,
                'has_attachment' => filled($m->attachment_path),
                'created_at' => $m->created_at?->toIso8601String(),
            ]),
        ]]);
    }

    public function storeMessage(Request $request, Ticket $ticket): JsonResponse
    {
        $data = $request->validate(['message' => ['required', 'string', 'max:5000']]);

        $ticket->messages()->create([
            'user_id' => $request->user()->id,
            'message' => $data['message'],
            'is_admin_reply' => true,
        ]);

        $ticket->update(['status' => 'answered']);
        $ticket->load(['user', 'messages']);

        return response()->json(['data' => $this->listPayload($ticket)]);
    }

    public function update(Request $request, Ticket $ticket): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string', 'in:open,answered,waiting_user,closed'],
            'priority' => ['sometimes', 'string', 'in:low,normal,high'],
        ]);

        $ticket->update($data);

        return response()->json(['data' => $this->listPayload($ticket)]);
    }

    /** @return array<string, mixed> */
    private function listPayload(Ticket $t): array
    {
        return [
            'id' => $t->id,
            'subject' => $t->subject,
            'department' => $t->department,
            'status' => $t->status->value,
            'priority' => $t->priority->value,
            'user_name' => $t->user?->name,
            'user_mobile' => $t->user?->mobile,
            'created_at' => $t->created_at?->toIso8601String(),
        ];
    }
}
