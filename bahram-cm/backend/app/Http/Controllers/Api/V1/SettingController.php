<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\UpdateSettingRequest;
use App\Services\ContentPublishService;
use App\Services\SettingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /** Groups editable only by super-admin (site settings page). */
    private const SUPER_ADMIN_GROUPS = ['site', 'links'];

    public function __construct(
        private readonly SettingService $service,
        private readonly ContentPublishService $publish,
    ) {
    }

    public function publicIndex(): JsonResponse
    {
        return response()->json(['data' => $this->service->publicSettings()]);
    }

    public function show(Request $request, string $group): JsonResponse
    {
        $this->assertCanReadSettingsGroup($request, $group);

        return response()->json(['data' => $this->service->group($group)]);
    }

    public function update(UpdateSettingRequest $request, string $group): JsonResponse
    {
        $data = $this->service->updateGroup($group, $request->validated()['values']);
        $this->publish->revalidateSiteSettings($group);

        return response()->json(['data' => $data]);
    }

    private function assertCanReadSettingsGroup(Request $request, string $group): void
    {
        if (in_array($group, self::SUPER_ADMIN_GROUPS, true)) {
            abort_unless($request->user()?->isSuperAdmin(), 403);

            return;
        }

        abort_unless($request->user()?->hasPermission('settings.view'), 403);
    }
}
