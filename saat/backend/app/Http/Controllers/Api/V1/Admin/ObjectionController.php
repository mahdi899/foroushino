<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\StoreObjectionRequest;
use App\Http\Requests\V1\Admin\UpdateObjectionRequest;
use App\Http\Resources\V1\ObjectionResource;
use App\Models\Objection;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ObjectionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizeTraining($request);

        $objections = Objection::query()->with('product')->orderBy('title')->get();

        return ApiResponse::success(ObjectionResource::collection($objections));
    }

    public function store(StoreObjectionRequest $request): JsonResponse
    {
        $objection = Objection::query()->create($request->validated());

        return ApiResponse::success(new ObjectionResource($objection), 'اعتراض ایجاد شد', 201);
    }

    public function update(UpdateObjectionRequest $request, Objection $objection): JsonResponse
    {
        $objection->update($request->validated());

        return ApiResponse::success(new ObjectionResource($objection->fresh()), 'اعتراض به‌روزرسانی شد');
    }

    public function destroy(Request $request, Objection $objection): JsonResponse
    {
        $this->authorizeTrainingManage($request);
        $objection->delete();

        return ApiResponse::success(null, 'اعتراض حذف شد');
    }

    private function authorizeTraining(Request $request): void
    {
        $user = $request->user();
        abort_unless(
            $user && ($user->can('training.manage') || $user->can('training.view')),
            403,
            'اجازه دسترسی ندارید.',
        );
    }

    private function authorizeTrainingManage(Request $request): void
    {
        abort_unless((bool) $request->user()?->can('training.manage'), 403, 'اجازه دسترسی ندارید.');
    }
}
