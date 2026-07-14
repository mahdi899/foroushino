<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Models\Call;
use App\Models\FollowUp;
use App\Models\Lead;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\TeamScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportsController extends Controller
{
    public function sources(Request $request): JsonResponse
    {
        $this->authorizeReports($request);
        $teamId = $this->teamScope($request);

        $query = Lead::query()->selectRaw('source, count(*) as total, sum(case when status = ? then 1 else 0 end) as won', ['won'])
            ->groupBy('source');

        if ($teamId) {
            $query->where('assigned_team_id', $teamId);
        }

        $rows = $query->get()->map(fn ($row) => [
            'source' => $row->source,
            'total' => (int) $row->total,
            'won' => (int) $row->won,
            'conversion_rate' => $row->total > 0 ? round(($row->won / $row->total) * 100, 1) : 0,
        ]);

        return ApiResponse::success($rows);
    }

    public function pipeline(Request $request): JsonResponse
    {
        $this->authorizeReports($request);
        $teamId = $this->teamScope($request);

        $query = Lead::query()->selectRaw('status, count(*) as total')->groupBy('status');
        if ($teamId) {
            $query->where('assigned_team_id', $teamId);
        }

        return ApiResponse::success($query->pluck('total', 'status'));
    }

    /**
     * Single grouped aggregate query (no per-agent N+1) so this stays fast
     * even across the full 500-agent roster.
     */
    public function weakAgents(Request $request): JsonResponse
    {
        $this->authorizeReports($request);
        $teamId = $this->teamScope($request);
        $since = now()->subDays((int) $request->input('days', 7));

        $callStats = Call::query()
            ->selectRaw('agent_id, count(*) as calls')
            ->where('created_at', '>=', $since)
            ->groupBy('agent_id')
            ->pluck('calls', 'agent_id');

        $saleStats = \App\Models\Sale::query()
            ->selectRaw('agent_id, count(*) as confirmed_sales')
            ->where('status', 'confirmed')
            ->where('created_at', '>=', $since)
            ->groupBy('agent_id')
            ->pluck('confirmed_sales', 'agent_id');

        $agents = User::query()->role(RoleName::Agent->value)->where('is_active', true);
        if ($teamId) {
            $agents->where('team_id', $teamId);
        }

        $rows = $agents->get(['id', 'name'])->map(function (User $agent) use ($callStats, $saleStats) {
            $calls = (int) ($callStats[$agent->id] ?? 0);
            $sales = (int) ($saleStats[$agent->id] ?? 0);

            return [
                'agent_id' => $agent->id,
                'agent_name' => $agent->name,
                'calls' => $calls,
                'confirmed_sales' => $sales,
                'conversion_rate' => $calls > 0 ? round(($sales / $calls) * 100, 1) : 0,
            ];
        })
            ->filter(fn ($row) => $row['calls'] >= 15 && $row['conversion_rate'] < 3)
            ->sortBy('conversion_rate')
            ->values();

        return ApiResponse::success($rows);
    }

    public function overdue(Request $request): JsonResponse
    {
        $this->authorizeReports($request);
        $teamId = $this->teamScope($request);

        $query = FollowUp::query()->overdue()->with(['agent', 'lead']);
        if ($teamId) {
            $query->whereHas('agent', fn ($q) => $q->where('team_id', $teamId));
        }

        $byAgent = $query->get()->groupBy('agent_id')->map(fn ($group, $agentId) => [
            'agent_id' => (int) $agentId,
            'agent_name' => $group->first()->agent?->name,
            'overdue_count' => $group->count(),
        ])->values();

        return ApiResponse::success($byAgent);
    }

    /**
     * Single grouped aggregate query (conditional SUMs) instead of looping
     * per agent, so this stays fast across the full agent roster.
     */
    public function suspicious(Request $request): JsonResponse
    {
        $this->authorizeReports($request);
        $teamId = $this->teamScope($request);
        $since = now()->subDays((int) $request->input('days', 1));

        $stats = Call::query()
            ->selectRaw(
                'agent_id, count(*) as total_calls, '.
                'sum(case when duration_sec < 5 then 1 else 0 end) as ghost_calls, '.
                'sum(case when result = ? then 1 else 0 end) as duplicate_marks, '.
                'sum(case when result = ? then 1 else 0 end) as dnd_marks',
                ['duplicate', 'do_not_disturb'],
            )
            ->where('created_at', '>=', $since)
            ->groupBy('agent_id')
            ->having('total_calls', '>=', 10)
            ->get()
            ->keyBy('agent_id');

        $agents = User::query()->role(RoleName::Agent->value)->where('is_active', true)
            ->whereIn('id', $stats->keys());
        if ($teamId) {
            $agents->where('team_id', $teamId);
        }

        $flags = $agents->get(['id', 'name'])->map(function (User $agent) use ($stats) {
            $row = $stats[$agent->id];
            $totalCalls = (int) $row->total_calls;

            $reasons = [];
            if (($row->ghost_calls / $totalCalls) > 0.4) {
                $reasons[] = 'نرخ بالای تماس‌های خیلی کوتاه (کمتر از ۵ ثانیه)';
            }
            if (($row->duplicate_marks / $totalCalls) > 0.3) {
                $reasons[] = 'نرخ بالای ثبت لید تکراری';
            }
            if (($row->dnd_marks / $totalCalls) > 0.3) {
                $reasons[] = 'نرخ بالای ثبت عدم تماس مجدد';
            }

            return [
                'agent_id' => $agent->id,
                'agent_name' => $agent->name,
                'total_calls' => $totalCalls,
                'reasons' => $reasons,
            ];
        })->filter(fn ($row) => count($row['reasons']) > 0)->values();

        return ApiResponse::success($flags);
    }

    private function authorizeReports(Request $request): void
    {
        abort_unless((bool) $request->user()?->can('reports.view'), 403, 'اجازه دسترسی به گزارش‌ها را ندارید.');
    }

    private function teamScope(Request $request): ?int
    {
        return TeamScope::teamIdForQueries($request->user());
    }
}
