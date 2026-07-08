<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Models\User;
use App\Services\InAppNotificationService;
use App\Services\SmsService;
use App\Support\Mobile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TicketAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Ticket::query()->with('user')->orderByDesc('id');

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        if ($userId = $request->integer('user_id') ?: null) {
            $query->where('user_id', $userId);
        }

        $tickets = $query->paginate(min(max((int) $request->input('per_page', 50), 1), 100));

        return response()->json([
            'data' => $tickets->getCollection()->map(fn (Ticket $t) => $this->listPayload($t)),
            'meta' => ['current_page' => $tickets->currentPage(), 'last_page' => $tickets->lastPage(), 'total' => $tickets->total()],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required_without:mobile', 'integer', 'exists:users,id'],
            'mobile' => ['required_without:user_id', 'string'],
            'department' => ['nullable', 'string', 'max:120'],
            'subject' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $student = isset($data['user_id'])
            ? User::query()->findOrFail($data['user_id'])
            : User::query()->where('mobile', Mobile::normalize($data['mobile']))->first();

        if (! $student || $student->is_admin) {
            return response()->json([
                'error' => ['code' => 'student_not_found', 'message_fa' => 'دانشجویی با این مشخصات یافت نشد.'],
            ], 422);
        }

        $ticket = $student->tickets()->create([
            'department' => $data['department'] ?? null,
            'subject' => $data['subject'],
            'status' => 'waiting_user',
            'priority' => 'normal',
        ]);

        $ticket->messages()->create([
            'user_id' => $request->user()->id,
            'message' => $data['message'],
            'is_admin_reply' => true,
        ]);

        $ticket->load(['user', 'messages.user']);

        app(SmsService::class)->sendTicketReply($ticket);
        app(InAppNotificationService::class)->ticketReply($ticket);

        return response()->json(['data' => $this->listPayload($ticket)], 201);
    }

    public function show(Ticket $ticket): JsonResponse
    {
        $ticket->load(['user', 'messages.user']);

        return response()->json(['data' => [
            ...$this->listPayload($ticket),
            'messages' => $ticket->messages->map(fn ($m) => [
                'id' => $m->id,
                'message' => $m->message,
                'is_admin_reply' => $m->is_admin_reply,
                'sender_name' => $m->user?->name ?? ($m->is_admin_reply ? 'پشتیبان' : 'دانشجو'),
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
        $ticket->load(['user', 'messages.user']);

        app(SmsService::class)->sendTicketReply($ticket);
        app(InAppNotificationService::class)->ticketReply($ticket);

        return response()->json(['data' => $this->listPayload($ticket)]);
    }

    public function update(Request $request, Ticket $ticket): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string', 'in:open,answered,waiting_user,closed'],
        ]);

        $ticket->update($data);

        return response()->json(['data' => $this->listPayload($ticket)]);
    }

    public function users(Request $request): JsonResponse
    {
        $search = $request->string('search')->trim()->toString();
        $perPage = min(max((int) $request->input('per_page', 30), 1), 100);

        $query = DB::table('tickets')
            ->join('users', 'tickets.user_id', '=', 'users.id')
            ->select(
                'users.id as user_id',
                'users.name',
                'users.mobile',
                DB::raw('COUNT(tickets.id) as tickets_count'),
                DB::raw("SUM(CASE WHEN tickets.status IN ('open','waiting_user') THEN 1 ELSE 0 END) as open_count"),
                DB::raw('MAX(tickets.created_at) as last_ticket_at')
            )
            ->groupBy('users.id', 'users.name', 'users.mobile')
            ->orderByDesc('last_ticket_at');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('users.name', 'like', "%{$search}%")
                    ->orWhere('users.mobile', 'like', "%{$search}%");
            });
        }

        $users = $query->paginate($perPage);

        return response()->json([
            'data' => $users->getCollection(),
            'meta' => ['current_page' => $users->currentPage(), 'last_page' => $users->lastPage(), 'total' => $users->total()],
        ]);
    }

    public function reports(Request $request): JsonResponse
    {
        $base = Ticket::query();

        if ($from = $request->string('from')->toString()) {
            $base->whereDate('created_at', '>=', $from);
        }
        if ($to = $request->string('to')->toString()) {
            $base->whereDate('created_at', '<=', $to);
        }
        if ($status = $request->string('status')->toString()) {
            $base->where('status', $status);
        }
        if ($department = $request->string('department')->toString()) {
            $base->where('department', $department);
        }

        $summary = [
            'total' => (clone $base)->count(),
            'open' => (clone $base)->where('status', 'open')->count(),
            'answered' => (clone $base)->where('status', 'answered')->count(),
            'waiting_user' => (clone $base)->where('status', 'waiting_user')->count(),
            'closed' => (clone $base)->where('status', 'closed')->count(),
        ];

        $byDepartment = (clone $base)
            ->select('department', DB::raw('COUNT(*) as count'))
            ->groupBy('department')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($row) => ['department' => $row->department ?? 'general', 'count' => (int) $row->count]);

        $byDay = (clone $base)
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('COUNT(*) as created'),
                DB::raw("SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed")
            )
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy(DB::raw('DATE(created_at)'))
            ->limit(60)
            ->get()
            ->map(fn ($row) => ['date' => $row->date, 'created' => (int) $row->created, 'closed' => (int) $row->closed]);

        $topUsers = (clone $base)
            ->join('users', 'tickets.user_id', '=', 'users.id')
            ->select('users.id as user_id', 'users.name', 'users.mobile', DB::raw('COUNT(*) as count'))
            ->groupBy('users.id', 'users.name', 'users.mobile')
            ->orderByDesc('count')
            ->limit(10)
            ->get();

        return response()->json(['data' => [
            'summary' => $summary,
            'by_department' => $byDepartment,
            'by_day' => $byDay,
            'top_users' => $topUsers,
        ]]);
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
            'user_id' => $t->user_id,
            'user_name' => $t->user?->name,
            'user_mobile' => $t->user?->mobile,
            'created_at' => $t->created_at?->toIso8601String(),
            'updated_at' => $t->updated_at?->toIso8601String(),
        ];
    }
}
