<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\AdminRoleName;
use App\Enums\TicketTechEscalation;
use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\User;
use App\Services\AdminTelegramLogService;
use App\Services\InAppNotificationService;
use App\Services\SmsService;
use App\Support\Mobile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TicketAdminController extends Controller
{
    private const DEPARTMENTS = ['technical', 'financial', 'course', 'general'];

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermission('tickets.view'), 403);

        $query = Ticket::query()
            ->with(['user', 'techResolver'])
            ->orderByRaw("CASE status WHEN 'open' THEN 0 WHEN 'in_review' THEN 1 WHEN 'answered' THEN 2 WHEN 'waiting_user' THEN 3 WHEN 'closed' THEN 4 ELSE 5 END")
            ->orderByDesc('id');

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        if ($department = $request->string('department')->toString()) {
            if ($department === 'general') {
                $query->where(function ($q) {
                    $q->whereNull('department')->orWhere('department', 'general');
                });
            } else {
                $query->where('department', $department);
            }
        }

        if ($techEscalation = $request->string('tech_escalation')->toString()) {
            $query->where('tech_escalation', $techEscalation);
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
        abort_unless($request->user()->hasPermission('tickets.manage'), 403);

        if ($this->mustUseInternalOnly($request->user())) {
            return response()->json([
                'error' => [
                    'code' => 'forbidden',
                    'message_fa' => 'پشتیبان فنی نمی‌تواند تیکت جدید برای مخاطب باز کند؛ فقط پشتیبانی مجاز است.',
                ],
            ], 403);
        }

        $data = $request->validate([
            'user_id' => ['required_without:mobile', 'integer', 'exists:users,id'],
            'mobile' => ['required_without:user_id', 'string'],
            'department' => ['nullable', 'string', Rule::in(self::DEPARTMENTS)],
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

        $department = $data['department'] ?? null;
        if ($department === 'general') {
            $department = null;
        }

        $ticket = $student->tickets()->create([
            'department' => $department,
            'tech_escalation' => $department === 'technical' ? TicketTechEscalation::TechSupport : null,
            'subject' => $data['subject'],
            'status' => 'waiting_user',
            'priority' => 'normal',
        ]);

        $ticket->messages()->create([
            'user_id' => $request->user()->id,
            'message' => $data['message'],
            'is_admin_reply' => true,
            'is_internal' => false,
        ]);

        $ticket->load(['user', 'messages.user', 'techResolver']);

        app(SmsService::class)->sendTicketReply($ticket);
        app(InAppNotificationService::class)->ticketReply($ticket);
        app(AdminTelegramLogService::class)->notifyTicketAdminReply($ticket, $data['message']);

        return response()->json(['data' => $this->listPayload($ticket)], 201);
    }

    public function show(Request $request, Ticket $ticket): JsonResponse
    {
        abort_unless($request->user()->hasPermission('tickets.view'), 403);

        $ticket->load(['user', 'messages.user', 'techResolver']);

        return response()->json(['data' => [
            ...$this->listPayload($ticket),
            'messages' => $ticket->messages->map(fn ($m) => $this->messagePayload($m)),
            'can_reply_to_user' => $this->canReplyToUser($request->user()),
            'must_use_internal' => $this->mustUseInternalOnly($request->user()),
        ]]);
    }

    public function storeMessage(Request $request, Ticket $ticket): JsonResponse
    {
        abort_unless($request->user()->hasPermission('tickets.manage'), 403);

        $data = $request->validate([
            'message' => ['required', 'string', 'max:5000'],
            'is_internal' => ['sometimes', 'boolean'],
        ]);

        $actor = $request->user();
        $wantsInternal = (bool) ($data['is_internal'] ?? false);

        if ($this->mustUseInternalOnly($actor)) {
            $wantsInternal = true;
        }

        if (! $wantsInternal && ! $this->canReplyToUser($actor)) {
            return response()->json([
                'error' => [
                    'code' => 'forbidden',
                    'message_fa' => 'پشتیبان فنی و مدیر فنی فقط می‌توانند پیام داخلی برای پشتیبانی بفرستند؛ پاسخ به مخاطب فقط توسط پشتیبانی انجام می‌شود.',
                ],
            ], 403);
        }

        if ($wantsInternal) {
            $ticket->messages()->create([
                'user_id' => $actor->id,
                'message' => $data['message'],
                'is_admin_reply' => true,
                'is_internal' => true,
            ]);

            $ticket->load(['user', 'messages.user', 'techResolver']);

            app(AdminTelegramLogService::class)->notifyTicketInternalNote(
                $ticket,
                $data['message'],
                $actor->name ?? 'همکار',
            );

            return response()->json(['data' => [
                ...$this->listPayload($ticket),
                'messages' => $ticket->messages->map(fn ($m) => $this->messagePayload($m)),
                'can_reply_to_user' => $this->canReplyToUser($actor),
                'must_use_internal' => $this->mustUseInternalOnly($actor),
            ]]);
        }

        app(\App\Modules\TelegramBot\Services\BotTicketDeliveryService::class)
            ->deliverAdminReply($ticket, $data['message'], null, (int) $actor->id);

        $ticket->load(['user', 'messages.user', 'techResolver']);

        app(SmsService::class)->sendTicketReply($ticket);
        app(InAppNotificationService::class)->ticketReply($ticket);
        app(AdminTelegramLogService::class)->notifyTicketAdminReply($ticket, $data['message']);

        return response()->json(['data' => [
            ...$this->listPayload($ticket),
            'messages' => $ticket->messages->map(fn ($m) => $this->messagePayload($m)),
            'can_reply_to_user' => $this->canReplyToUser($actor),
            'must_use_internal' => $this->mustUseInternalOnly($actor),
        ]]);
    }

    public function update(Request $request, Ticket $ticket): JsonResponse
    {
        abort_unless($request->user()->hasPermission('tickets.manage'), 403);

        $data = $request->validate([
            'status' => ['sometimes', 'required', 'string', 'in:open,in_review,answered,waiting_user,closed'],
            'department' => ['sometimes', 'nullable', 'string', Rule::in(self::DEPARTMENTS)],
            'tech_escalation' => ['sometimes', 'required', 'string', Rule::in(TicketTechEscalation::values())],
        ]);

        if (
            ! array_key_exists('status', $data)
            && ! array_key_exists('department', $data)
            && ! array_key_exists('tech_escalation', $data)
        ) {
            return response()->json([
                'error' => [
                    'code' => 'validation_error',
                    'message_fa' => 'حداقل یکی از وضعیت، بخش یا ارجاع فنی باید ارسال شود.',
                ],
            ], 422);
        }

        $payload = [];
        if (array_key_exists('status', $data)) {
            $payload['status'] = $data['status'];
        }

        if (array_key_exists('department', $data)) {
            $department = ($data['department'] === 'general' || $data['department'] === null)
                ? null
                : $data['department'];
            $payload['department'] = $department;

            if ($department === 'technical' && $ticket->tech_escalation === null) {
                $payload['tech_escalation'] = TicketTechEscalation::TechSupport;
                $payload['tech_resolved_at'] = null;
                $payload['tech_resolved_by'] = null;
            }

            if ($department !== 'technical' && ! array_key_exists('tech_escalation', $data)) {
                $payload['tech_escalation'] = null;
                $payload['tech_resolved_at'] = null;
                $payload['tech_resolved_by'] = null;
            }
        }

        if (array_key_exists('tech_escalation', $data)) {
            $target = TicketTechEscalation::from($data['tech_escalation']);
            $error = $this->authorizeTechEscalationChange($request->user(), $ticket, $target);
            if ($error !== null) {
                return $error;
            }

            $payload['department'] = 'technical';
            $payload['tech_escalation'] = $target;

            if ($target === TicketTechEscalation::Resolved) {
                $payload['tech_resolved_at'] = now();
                $payload['tech_resolved_by'] = $request->user()->id;
            } else {
                $payload['tech_resolved_at'] = null;
                $payload['tech_resolved_by'] = null;
            }
        }

        $ticket->update($payload);
        $ticket->load(['user', 'techResolver']);

        return response()->json(['data' => $this->listPayload($ticket)]);
    }

    public function users(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermission('tickets.view'), 403);

        $search = $request->string('search')->trim()->toString();
        $perPage = min(max((int) $request->input('per_page', 30), 1), 100);

        $query = DB::table('tickets')
            ->join('users', 'tickets.user_id', '=', 'users.id')
            ->select(
                'users.id as user_id',
                'users.name',
                'users.mobile',
                DB::raw('COUNT(tickets.id) as tickets_count'),
                DB::raw("SUM(CASE WHEN tickets.status = 'open' THEN 1 ELSE 0 END) as open_count"),
                DB::raw('MAX(tickets.created_at) as last_ticket_at')
            )
            ->groupBy('users.id', 'users.name', 'users.mobile')
            ->orderByDesc('open_count')
            ->orderByDesc('last_ticket_at');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('users.name', 'like', "%{$search}%")
                    ->orWhere('users.mobile', 'like', "%{$search}%");
            });
        }

        $users = $query->paginate($perPage);

        return response()->json([
            'data' => $users->getCollection()->map(fn ($row) => [
                'user_id' => (int) $row->user_id,
                'name' => $row->name,
                'mobile' => $row->mobile,
                'tickets_count' => (int) $row->tickets_count,
                'open_count' => (int) $row->open_count,
                'last_ticket_at' => $row->last_ticket_at,
            ]),
            'meta' => ['current_page' => $users->currentPage(), 'last_page' => $users->lastPage(), 'total' => $users->total()],
        ]);
    }

    public function reports(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermission('tickets.view'), 403);

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
            'in_review' => (clone $base)->where('status', 'in_review')->count(),
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

    private function authorizeTechEscalationChange(User $actor, Ticket $ticket, TicketTechEscalation $target): ?JsonResponse
    {
        if (! $actor->hasPermission('tickets.technical') && ! $actor->isSuperAdmin()) {
            return response()->json([
                'error' => [
                    'code' => 'forbidden',
                    'message_fa' => 'اجازه تغییر ارجاع فنی را ندارید.',
                ],
            ], 403);
        }

        $level = $this->actorTechLevel($actor);

        if ($target === TicketTechEscalation::Resolved) {
            if ($level === null) {
                return response()->json([
                    'error' => [
                        'code' => 'forbidden',
                        'message_fa' => 'اجازه اعلام حل مشکل فنی را ندارید.',
                    ],
                ], 403);
            }

            return null;
        }

        if ($target === TicketTechEscalation::TechManager) {
            if (! in_array($level, ['tech_support', 'tech_manager', 'super_admin'], true)) {
                return response()->json([
                    'error' => [
                        'code' => 'forbidden',
                        'message_fa' => 'اجازه ارجاع به مدیر فنی را ندارید.',
                    ],
                ], 403);
            }

            return null;
        }

        if ($target === TicketTechEscalation::SuperAdmin) {
            if (! in_array($level, ['tech_manager', 'super_admin'], true)) {
                return response()->json([
                    'error' => [
                        'code' => 'forbidden',
                        'message_fa' => 'اجازه ارجاع به مدیر کل را ندارید.',
                    ],
                ], 403);
            }

            return null;
        }

        if ($target === TicketTechEscalation::TechSupport) {
            if ($level !== 'super_admin' && $level !== 'tech_manager') {
                return response()->json([
                    'error' => [
                        'code' => 'forbidden',
                        'message_fa' => 'اجازه بازگردانی به پشتیبان فنی را ندارید.',
                    ],
                ], 403);
            }

            return null;
        }

        return response()->json([
            'error' => [
                'code' => 'validation_error',
                'message_fa' => 'وضعیت ارجاع فنی نامعتبر است.',
            ],
        ], 422);
    }

    private function actorTechLevel(User $actor): ?string
    {
        if ($actor->isSuperAdmin() || $actor->isRootAdmin()) {
            return 'super_admin';
        }
        if ($actor->hasRole(AdminRoleName::TechManager->value)) {
            return 'tech_manager';
        }
        if ($actor->hasRole(AdminRoleName::TechSupport->value)) {
            return 'tech_support';
        }

        return null;
    }

    /**
     * پشتیبان فنی و مدیر فنی فقط پیام داخلی می‌فرستند؛ پاسخ به مخاطب فقط برای پشتیبانی.
     */
    private function mustUseInternalOnly(User $actor): bool
    {
        if ($actor->hasRole(AdminRoleName::Support->value)) {
            return false;
        }

        return $actor->hasRole(AdminRoleName::TechSupport->value)
            || $actor->hasRole(AdminRoleName::TechManager->value);
    }

    private function canReplyToUser(User $actor): bool
    {
        return ! $this->mustUseInternalOnly($actor);
    }

    /** @return array<string, mixed> */
    private function messagePayload(TicketMessage $m): array
    {
        $roleLabel = null;
        if ($m->is_admin_reply && $m->user) {
            $roleLabel = $this->primaryStaffRoleLabel($m->user);
        }

        return [
            'id' => $m->id,
            'message' => $m->message,
            'is_admin_reply' => $m->is_admin_reply,
            'is_internal' => (bool) $m->is_internal,
            'sender_name' => $m->user?->name ?? ($m->is_admin_reply ? 'پشتیبان' : 'دانشجو'),
            'sender_role_label' => $roleLabel,
            'has_attachment' => filled($m->attachment_path),
            'created_at' => $m->created_at?->toIso8601String(),
        ];
    }

    private function primaryStaffRoleLabel(User $user): string
    {
        foreach ([
            AdminRoleName::SuperAdmin,
            AdminRoleName::TechManager,
            AdminRoleName::TechSupport,
            AdminRoleName::Support,
            AdminRoleName::Admin,
        ] as $role) {
            if ($user->hasRole($role->value)) {
                return $role->label();
            }
        }

        return 'پشتیبان';
    }

    /** @return array<string, mixed> */
    private function listPayload(Ticket $t): array
    {
        return [
            'id' => $t->id,
            'subject' => $t->subject,
            'department' => $t->department,
            'tech_escalation' => $t->tech_escalation?->value,
            'tech_escalation_label' => $t->tech_escalation?->label(),
            'tech_resolved_at' => $t->tech_resolved_at?->toIso8601String(),
            'tech_resolved_by' => $t->tech_resolved_by,
            'tech_resolver_name' => $t->techResolver?->name,
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
