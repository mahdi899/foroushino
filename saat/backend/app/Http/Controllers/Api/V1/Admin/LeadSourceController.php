<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\StoreLeadSourceRequest;
use App\Http\Requests\V1\Admin\UpdateLeadSourceRequest;
use App\Http\Resources\V1\LeadSourceResource;
use App\Models\LeadSourceCatalog;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadSourceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $sources = LeadSourceCatalog::query()->orderBy('sort_order')->orderBy('label')->get();

        return ApiResponse::success(LeadSourceResource::collection($sources));
    }

    public function store(StoreLeadSourceRequest $request): JsonResponse
    {
        $source = LeadSourceCatalog::query()->create([
            ...$request->validated(),
            'is_system' => false,
        ]);

        return ApiResponse::success(new LeadSourceResource($source), 'منبع ورود ایجاد شد', 201);
    }

    public function update(UpdateLeadSourceRequest $request, LeadSourceCatalog $leadSource): JsonResponse
    {
        $leadSource->update($request->validated());

        return ApiResponse::success(new LeadSourceResource($leadSource->fresh()), 'منبع ورود به‌روزرسانی شد');
    }

    public function destroy(Request $request, LeadSourceCatalog $leadSource): JsonResponse
    {
        $this->authorizeAdmin($request);

        abort_if($leadSource->is_system, 422, 'منبع سیستمی قابل حذف نیست.');

        $leadSource->update(['is_active' => false]);

        return ApiResponse::success(null, 'منبع ورود غیرفعال شد');
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless((bool) $request->user()?->can('admin.settings'), 403, 'اجازه دسترسی ندارید.');
    }
}
