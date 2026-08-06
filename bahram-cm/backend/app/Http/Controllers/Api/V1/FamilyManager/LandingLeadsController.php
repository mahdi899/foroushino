<?php

namespace App\Http\Controllers\Api\V1\FamilyManager;

use App\Http\Controllers\Controller;
use App\Models\Family;
use App\Models\LandingPage;
use App\Models\Lead;
use App\Services\Family\LandingLeadAssignmentService;
use App\Support\ApiResponse;
use App\Support\SensitiveData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LandingLeadsController extends Controller
{
    private const STATUS_LABELS = [
        'new' => 'جدید',
        'contacted' => 'تماس گرفته شده',
        'converted' => 'تبدیل شده',
        'ignored' => 'رد شده',
    ];

    public function __construct(
        private readonly LandingLeadAssignmentService $assignments,
    ) {}

    public function landingPages(): JsonResponse
    {
        $pages = LandingPage::query()
            ->withCount([
                'leads as unassigned_count' => fn ($q) => $q->whereNull('family_id'),
            ])
            ->orderByDesc('id')
            ->get()
            ->map(fn (LandingPage $page) => [
                'id' => $page->id,
                'title' => $page->title,
                'slug' => $page->slug,
                'unassigned_count' => (int) ($page->unassigned_count ?? 0),
            ]);

        return ApiResponse::success($pages);
    }

    public function index(Request $request): JsonResponse
    {
        $query = Lead::query()
            ->with(['landingPage:id,title,slug', 'family:id,internal_name'])
            ->whereNotNull('landing_page_id')
            ->orderByDesc('id');

        if ($request->boolean('unassigned')) {
            $query->whereNull('family_id');
        }

        if ($landingPageId = $request->input('landing_page_id')) {
            $query->where('landing_page_id', (int) $landingPageId);
        }

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        if ($search = $request->string('search')->toString()) {
            $query->where(function ($inner) use ($search) {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($from = $request->string('from_date')->toString()) {
            $query->whereDate('created_at', '>=', $from);
        }

        if ($to = $request->string('to_date')->toString()) {
            $query->whereDate('created_at', '<=', $to);
        }

        $leads = $query->paginate(min(50, (int) $request->input('per_page', 25)));

        $items = collect($leads->items())->map(fn (Lead $lead) => $this->present($lead))->all();

        return ApiResponse::success($items, 200, [
            'current_page' => $leads->currentPage(),
            'last_page' => $leads->lastPage(),
            'total' => $leads->total(),
        ]);
    }

    public function assign(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'family_id' => ['required', 'integer', 'exists:families,id'],
        ]);

        $family = Family::query()->findOrFail($data['family_id']);
        $result = $this->assignments->assign($lead, $family, $request->user());

        return ApiResponse::success([
            'lead' => $this->present($result['lead']),
            'membership' => [
                'id' => $result['membership']->id,
                'family_id' => $result['membership']->family_id,
                'user_id' => $result['membership']->user_id,
            ],
        ]);
    }

    /** @return array<string, mixed> */
    private function present(Lead $lead): array
    {
        return [
            'id' => $lead->id,
            'name' => $lead->name ?? '—',
            'phone' => $lead->phone,
            'phone_masked' => SensitiveData::maskMobile($lead->phone),
            'email' => $lead->email,
            'source' => $lead->source,
            'status' => $lead->status,
            'status_label' => self::STATUS_LABELS[$lead->status] ?? $lead->status,
            'is_assigned' => $lead->family_id !== null,
            'assigned_at' => $lead->assigned_at?->toIso8601String(),
            'created_at' => $lead->created_at?->toIso8601String() ?? '',
            'landing_page' => $lead->landingPage ? [
                'id' => $lead->landingPage->id,
                'title' => $lead->landingPage->title,
                'slug' => $lead->landingPage->slug,
            ] : null,
            'family' => $lead->family ? [
                'id' => $lead->family->id,
                'internal_name' => $lead->family->internal_name,
            ] : null,
        ];
    }
}
