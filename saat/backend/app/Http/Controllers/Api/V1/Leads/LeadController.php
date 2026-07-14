<?php

namespace App\Http\Controllers\Api\V1\Leads;

use App\Actions\Leads\AssignNextLeadAction;
use App\Actions\Leads\AutoAssignLeadsAction;
use App\Actions\Leads\DistributeLeadsToTeamsAction;
use App\Actions\Leads\ImportLeadsAction;
use App\Enums\LeadStatus;
use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Leads\IndexLeadRequest;
use App\Http\Requests\V1\Leads\StoreLeadRequest;
use App\Http\Resources\V1\ImportBatchResource;
use App\Http\Resources\V1\LeadResource;
use App\Models\AppSetting;
use App\Models\ImportBatch;
use App\Models\Lead;
use App\Models\LeadStatusHistory;
use App\Support\ApiResponse;
use App\Support\TeamScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LeadController extends Controller
{
    public function __construct(private readonly AssignNextLeadAction $assignNextLead) {}

    public function index(IndexLeadRequest $request): JsonResponse
    {
        $user = $request->user();

        $query = Lead::query()->with(['product', 'assignedAgent']);

        if (TeamScope::isOrgWide($user)) {
            // full visibility
        } elseif ($user->hasRole(RoleName::Leader->value)) {
            $query->where('assigned_team_id', $user->team_id);
        } else {
            $query->where('assigned_agent_id', $user->id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }
        if ($request->filled('temperature')) {
            $query->where('temperature', $request->string('temperature'));
        }
        if ($request->filled('source')) {
            $query->where('source', $request->string('source'));
        }
        if ($request->filled('agent_id')) {
            $query->where('assigned_agent_id', $request->integer('agent_id'));
        }
        if ($request->filled('search')) {
            $term = '%'.$request->string('search').'%';
            $query->where(function ($q) use ($term): void {
                $q->where('first_name', 'like', $term)
                    ->orWhere('last_name', 'like', $term)
                    ->orWhere('phone', 'like', $term)
                    ->orWhere('normalized_phone', 'like', $term);
            });
        }

        $leads = $query->orderByDesc('updated_at')->paginate($request->integer('per_page', 30));

        return ApiResponse::paginated(LeadResource::collection($leads));
    }

    public function show(Request $request, Lead $lead): JsonResponse
    {
        $this->authorize('view', $lead);

        $lead->load(['product', 'campaign', 'assignedAgent', 'statusHistories.byUser']);

        return ApiResponse::success(new LeadResource($lead));
    }

    public function next(Request $request): JsonResponse
    {
        $result = $this->assignNextLead->execute($request->user());

        if (! $result['lead']) {
            return ApiResponse::error('در حال حاضر مشتری جدیدی برای تماس وجود ندارد.', status: 404, code: 'no_leads_available');
        }

        return ApiResponse::success([
            'lead' => new LeadResource($result['lead']),
            'reason' => $result['reason']->value,
        ]);
    }

    public function lock(Request $request, Lead $lead): JsonResponse
    {
        $this->authorize('lock', $lead);

        $lead->locked_by = $request->user()->id;
        $lead->locked_until = now()->addMinutes(AppSetting::callLockMinutes());
        $lead->save();

        return ApiResponse::success(new LeadResource($lead), 'قفل تمدید شد');
    }

    public function release(Request $request, Lead $lead): JsonResponse
    {
        $this->authorize('view', $lead);

        $lead->locked_by = null;
        $lead->locked_until = null;
        $lead->save();

        return ApiResponse::success(new LeadResource($lead), 'قفل مشتری آزاد شد');
    }

    public function returnToPool(Request $request, Lead $lead): JsonResponse
    {
        $this->authorize('view', $lead);

        DB::transaction(function () use ($lead, $request): void {
            $lead->locked_by = null;
            $lead->locked_until = null;
            $lead->assigned_agent_id = null;
            $lead->returned_to_pool = true;
            $lead->status = LeadStatus::ReturnedToPool;
            $lead->save();

            LeadStatusHistory::query()->create([
                'lead_id' => $lead->id,
                'status' => LeadStatus::ReturnedToPool,
                'by_user_id' => $request->user()->id,
                'note' => 'بازگشت به استخر توسط کارشناس',
            ]);
        });

        return ApiResponse::success(new LeadResource($lead), 'مشتری به استخر بازگشت');
    }

    public function reclaim(Request $request, Lead $lead): JsonResponse
    {
        $this->authorize('reclaim', $lead);

        DB::transaction(function () use ($lead, $request): void {
            $lead->returned_to_pool = false;
            $lead->assigned_agent_id = $request->user()->id;
            $lead->assigned_team_id = $request->user()->team_id;
            $lead->status = LeadStatus::Assigned;
            $lead->save();

            LeadStatusHistory::query()->create([
                'lead_id' => $lead->id,
                'status' => LeadStatus::Assigned,
                'by_user_id' => $request->user()->id,
                'note' => 'بازپس‌گیری از صف عمومی',
            ]);
        });

        return ApiResponse::success(new LeadResource($lead), 'مشتری دوباره به تو اختصاص داده شد');
    }

    public function locked(Request $request): JsonResponse
    {
        $leads = Lead::query()
            ->where('locked_by', $request->user()->id)
            ->where('locked_until', '>', now())
            ->with('product')
            ->orderByDesc('locked_until')
            ->get();

        return ApiResponse::success(LeadResource::collection($leads));
    }

    public function returned(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Lead::query()->where('returned_to_pool', true);

        if (! $user->hasAnyRole([RoleName::Manager->value, RoleName::Admin->value, RoleName::Supervisor->value, RoleName::Leader->value])) {
            $query->where('assigned_agent_id', $user->id);
        }

        $leads = $query->with('product')->orderByDesc('updated_at')->limit(100)->get();

        return ApiResponse::success(LeadResource::collection($leads));
    }

    public function store(StoreLeadRequest $request): JsonResponse
    {
        $data = $request->validated();
        $phone = $this->normalizePhone((string) $data['phone']);
        $existing = Lead::query()->where('normalized_phone', $phone)->first();

        $lead = Lead::query()->create([
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'] ?? '',
            'phone' => $data['phone'],
            'normalized_phone' => $phone,
            'city' => $data['city'] ?? null,
            'source' => $data['source'] ?? 'form',
            'product_id' => $data['product_id'] ?? null,
            'status' => $existing ? LeadStatus::Duplicate : LeadStatus::New,
            'duplicate_of_id' => $existing?->id,
        ]);

        if (! $existing) {
            LeadStatusHistory::query()->create([
                'lead_id' => $lead->id,
                'status' => LeadStatus::New,
                'by_user_id' => $request->user()->id,
                'note' => 'ثبت دستی توسط '.$request->user()->name,
            ]);
        }

        $lead->load(['product', 'assignedAgent']);

        return ApiResponse::success(new LeadResource($lead), $existing ? 'این شماره قبلاً ثبت شده (تکراری).' : 'مشتری ثبت شد.', status: $existing ? 200 : 201);
    }

    public function autoAssign(Request $request, AutoAssignLeadsAction $action): JsonResponse
    {
        if (! $request->user()->can('leads.reassign')) {
            return ApiResponse::error('اجازه تخصیص مشتری ندارید.', status: 403, code: 'forbidden');
        }

        $result = $action->execute(
            $request->user(),
            (int) $request->input('limit', 200),
            $request->filled('team_id') ? (int) $request->input('team_id') : null,
        );

        return ApiResponse::success($result, 'تخصیص خودکار انجام شد');
    }

    public function distributeToTeams(Request $request, DistributeLeadsToTeamsAction $action): JsonResponse
    {
        if (! $request->user()->can('leads.reassign')) {
            return ApiResponse::error('اجازه تقسیم مشتری ندارید.', status: 403, code: 'forbidden');
        }

        $request->validate([
            'limit' => ['sometimes', 'integer', 'min:1', 'max:500'],
            'team_ids' => ['sometimes', 'array'],
            'team_ids.*' => ['integer', 'exists:teams,id'],
        ]);

        $result = $action->execute(
            $request->user(),
            (int) $request->input('limit', 200),
            $request->input('team_ids'),
        );

        return ApiResponse::success($result, 'مشتریان بین تیم‌ها تقسیم شدند');
    }

    public function import(Request $request, ImportLeadsAction $action): JsonResponse
    {
        if (! $request->user()->can('leads.import')) {
            return ApiResponse::error('اجازه ورود مشتری ندارید.', status: 403, code: 'forbidden');
        }

        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt'],
        ]);

        $file = $request->file('file');
        $rows = [];
        if (($handle = fopen($file->getRealPath(), 'r')) !== false) {
            $header = fgetcsv($handle);
            while (($row = fgetcsv($handle)) !== false) {
                if ($header && count($header) === count($row)) {
                    $rows[] = array_combine($header, $row);
                }
            }
            fclose($handle);
        }

        $batch = $action->execute($rows, $request->user(), $file->getClientOriginalName());

        return ApiResponse::success(new ImportBatchResource($batch), 'وارد کردن مشتریان انجام شد');
    }

    public function importBatch(Request $request, ImportBatch $importBatch): JsonResponse
    {
        if (! $request->user()->can('leads.import')) {
            return ApiResponse::error('اجازه دسترسی ندارید.', status: 403, code: 'forbidden');
        }

        return ApiResponse::success(new ImportBatchResource($importBatch));
    }

    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone) ?? '';

        if (str_starts_with($digits, '98') && strlen($digits) > 10) {
            $digits = '0'.substr($digits, 2);
        }

        if (str_starts_with($digits, '9') && strlen($digits) === 10) {
            $digits = '0'.$digits;
        }

        return $digits;
    }
}
