<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermission('audit.view') || $request->user()->isSuperAdmin(), 403);

        $query = AdminAuditLog::query()->with('actor:id,name,email')->orderByDesc('id');

        if ($action = $request->string('action')->trim()->toString()) {
            $query->where('action', 'like', "%{$action}%");
        }

        if ($actorId = $request->integer('actor_id')) {
            $query->where('actor_id', $actorId);
        }

        $logs = $query->paginate(min(max((int) $request->input('per_page', 50), 1), 100));

        return response()->json([
            'data' => $logs->getCollection()->map(fn (AdminAuditLog $log) => [
                'id' => $log->id,
                'actor_id' => $log->actor_id,
                'actor_name' => $log->actor?->name,
                'actor_email' => $log->actor?->email,
                'action' => $log->action,
                'subject_type' => $log->subject_type,
                'subject_id' => $log->subject_id,
                'request_id' => $log->request_id,
                'ip_address' => $log->ip_address,
                'user_agent' => $log->user_agent,
                'metadata' => $log->metadata,
                'created_at' => $log->created_at?->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'total' => $logs->total(),
            ],
        ]);
    }
}
