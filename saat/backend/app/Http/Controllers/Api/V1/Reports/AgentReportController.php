<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Actions\Reports\ApproveAgentReportAction;
use App\Actions\Reports\RejectAgentReportAction;
use App\Actions\Reports\SubmitAgentReportAction;
use App\Enums\AgentReportStatus;
use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\AgentReportResource;
use App\Models\AgentReport;
use App\Models\Team;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AgentReportController extends Controller
{
    public function __construct(
        private readonly SubmitAgentReportAction $submitReport,
        private readonly ApproveAgentReportAction $approveReport,
        private readonly RejectAgentReportAction $rejectReport,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', AgentReport::class);

        $user = $request->user();
        $query = AgentReport::query()
            ->with(['agent', 'team', 'approver', 'rejecter'])
            ->orderByDesc('report_date');

        if ($user->hasRole(RoleName::Agent->value)) {
            $query->where('agent_id', $user->id);
        } elseif ($user->hasRole(RoleName::Leader->value)) {
            $teamIds = Team::query()->where('leader_id', $user->id)->pluck('id');
            $query->whereIn('team_id', $teamIds);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('agent_id')) {
            $query->where('agent_id', $request->integer('agent_id'));
        }

        if ($request->filled('team_id')) {
            $query->where('team_id', $request->integer('team_id'));
        }

        if ($request->boolean('inbox')) {
            $query->where('status', AgentReportStatus::Submitted);
        }

        $reports = $query->paginate($request->integer('per_page', 30));

        return ApiResponse::paginated(AgentReportResource::collection($reports));
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', AgentReport::class);

        $validated = $request->validate([
            'agent_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $report = $this->submitReport->execute(
            $request->user(),
            $validated['agent_notes'] ?? null,
        );

        return ApiResponse::success(new AgentReportResource($report), 'گزارش روزانه برای لیدر ارسال شد');
    }

    public function approve(Request $request, AgentReport $agentReport): JsonResponse
    {
        $this->authorize('approve', $agentReport);

        $validated = $request->validate([
            'leader_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $report = $this->approveReport->execute(
            $agentReport,
            $request->user(),
            $validated['leader_notes'] ?? null,
        );

        return ApiResponse::success(new AgentReportResource($report), 'گزارش کارشناس تایید شد');
    }

    public function reject(Request $request, AgentReport $agentReport): JsonResponse
    {
        $this->authorize('reject', $agentReport);

        $validated = $request->validate([
            'leader_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $report = $this->rejectReport->execute(
            $agentReport,
            $request->user(),
            $validated['leader_notes'] ?? null,
        );

        return ApiResponse::success(new AgentReportResource($report), 'گزارش کارشناس رد شد');
    }
}
