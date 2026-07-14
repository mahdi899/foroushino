<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\StoreObjectionRequest;
use App\Http\Requests\V1\Admin\StoreScriptRequest;
use App\Http\Requests\V1\Admin\UpdateObjectionRequest;
use App\Http\Requests\V1\Admin\UpdateScriptRequest;
use App\Http\Resources\V1\ObjectionResource;
use App\Http\Resources\V1\ScriptResource;
use App\Models\Objection;
use App\Models\Script;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ScriptController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizeTraining($request);

        $scripts = Script::query()->with('product')->orderBy('title')->get();

        return ApiResponse::success(ScriptResource::collection($scripts));
    }

    public function store(StoreScriptRequest $request): JsonResponse
    {
        $script = Script::query()->create($request->validated());

        return ApiResponse::success(new ScriptResource($script), 'اسکریپت ایجاد شد', 201);
    }

    public function update(UpdateScriptRequest $request, Script $script): JsonResponse
    {
        $script->update($request->validated());

        return ApiResponse::success(new ScriptResource($script->fresh()), 'اسکریپت به‌روزرسانی شد');
    }

    public function destroy(Request $request, Script $script): JsonResponse
    {
        $this->authorizeTrainingManage($request);
        $script->delete();

        return ApiResponse::success(null, 'اسکریپت حذف شد');
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
