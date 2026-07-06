<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\StoreCampaignRequest;
use App\Http\Requests\V1\Admin\UpdateCampaignRequest;
use App\Http\Resources\V1\CampaignResource;
use App\Models\Campaign;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CampaignController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless((bool) $request->user()?->can('admin.products'), 403, 'اجازه دسترسی ندارید.');

        $campaigns = Campaign::query()->withCount('leads')->with('product')->orderByDesc('created_at')->get();

        return ApiResponse::success(CampaignResource::collection($campaigns));
    }

    public function store(StoreCampaignRequest $request): JsonResponse
    {
        $campaign = Campaign::query()->create($request->validated());

        return ApiResponse::success(new CampaignResource($campaign), 'کمپین ایجاد شد', 201);
    }

    public function update(UpdateCampaignRequest $request, Campaign $campaign): JsonResponse
    {
        $campaign->update($request->validated());

        return ApiResponse::success(new CampaignResource($campaign), 'کمپین به‌روزرسانی شد');
    }

    public function destroy(Request $request, Campaign $campaign): JsonResponse
    {
        abort_unless((bool) $request->user()?->can('admin.products'), 403, 'اجازه دسترسی ندارید.');

        $campaign->update(['is_active' => false]);

        return ApiResponse::success(null, 'کمپین غیرفعال شد');
    }
}
