<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Actions\Reports\ApproveTeamReportAction;
use App\Actions\Reports\ForwardTeamReportAction;
use App\Actions\Reports\SubmitTeamReportAction;
use App\Actions\Reports\UpdateTeamReportAction;
use App\Enums\RoleName;
use App\Enums\TeamReportStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\TeamReportResource;
use App\Models\Team;
use App\Models\TeamReport;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeamReportController extends Controller
{
    public function __construct(
        private readonly SubmitTeamReportAction $submitReport,
        private readonly ApproveTeamReportAction $approveReport,
        private readonly ForwardTeamReportAction $forwardReport,
        private readonly UpdateTeamReportAction $updateReport,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', TeamReport::class);

        $user = $request->user();
        $query = TeamReport::query()
            ->with(['team', 'submitter', 'approver', 'forwarder'])
            ->orderByDesc('report_date');

        if ($user->hasRole(RoleName::Leader->value)) {
            $query->whereHas('team', fn ($q) => $q->where('leader_id', $user->id));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('team_id')) {
            $query->where('team_id', $request->integer('team_id'));
        }

        if ($user->hasRole(RoleName::Manager->value) || $user->hasRole(RoleName::Admin->value)) {
            if ($request->boolean('inbox')) {
                $query->where('status', TeamReportStatus::ForwardedToManager);
            }
        }

        $reports = $query->paginate($request->integer('per_page', 30));

        return ApiResponse::paginated(TeamReportResource::collection($reports));
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', TeamReport::class);

        $user = $request->user();
        $team = Team::query()->where('leader_id', $user->id)->firstOrFail();

        $validated = $request->validate([
            'leader_notes' => ['nullable', 'string', 'max:2000'],
            'summary' => ['nullable', 'array'],
        ]);

        $report = $this->submitReport->execute(
            $team,
            $user,
            $validated['leader_notes'] ?? null,
            $validated['summary'] ?? null,
        );

        return ApiResponse::success(new TeamReportResource($report), 'گزارش روزانه برای سوپروایزر ارسال شد');
    }

    public function approve(Request $request, TeamReport $teamReport): JsonResponse
    {
        $this->authorize('approve', $teamReport);

        $validated = $request->validate([
            'supervisor_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $report = $this->approveReport->execute(
            $teamReport,
            $request->user(),
            $validated['supervisor_notes'] ?? null,
        );

        return ApiResponse::success(new TeamReportResource($report), 'گزارش تایید شد');
    }

    public function forward(Request $request, TeamReport $teamReport): JsonResponse
    {
        $this->authorize('forward', $teamReport);

        $report = $this->forwardReport->execute($teamReport, $request->user());

        return ApiResponse::success(new TeamReportResource($report), 'گزارش برای مدیریت ارسال شد');
    }

    public function update(Request $request, TeamReport $teamReport): JsonResponse
    {
        $this->authorize('update', $teamReport);

        $validated = $request->validate([
            'supervisor_notes' => ['nullable', 'string', 'max:2000'],
            'summary' => ['nullable', 'array'],
        ]);

        $report = $this->updateReport->execute(
            $teamReport,
            $request->user(),
            $validated['supervisor_notes'] ?? null,
            $validated['summary'] ?? null,
        );

        return ApiResponse::success(new TeamReportResource($report), 'ویرایش گزارش ذخیره شد');
    }
}
