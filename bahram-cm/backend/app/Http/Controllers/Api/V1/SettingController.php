<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\UpdateSettingRequest;
use App\Services\SettingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function __construct(private readonly SettingService $service)
    {
    }

    public function publicIndex(): JsonResponse
    {
        return response()->json(['data' => $this->service->publicSettings()]);
    }

    public function show(Request $request, string $group): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('settings.read'), 403);

        return response()->json(['data' => $this->service->group($group)]);
    }

    public function update(UpdateSettingRequest $request, string $group): JsonResponse
    {
        return response()->json(['data' => $this->service->updateGroup($group, $request->validated()['values'])]);
    }
}
