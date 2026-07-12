<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\SatApplication;
use App\Services\Sat\SatOutboundSyncService;
use App\Support\ApiResponse;
use App\Support\SatIntegrationConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SatIntegrationAdminController extends Controller
{
    public function __construct(private readonly SatOutboundSyncService $sync) {}

    public function show(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('sat.manage'), 403);

        return ApiResponse::success([
            'config' => SatIntegrationConfig::publicView(),
            'inbound_hint' => null,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('sat.manage'), 403);

        $data = $request->validate([
            'enabled' => ['sometimes', 'boolean'],
            'api_url' => ['sometimes', 'nullable', 'string', 'max:500', 'url'],
            'api_token' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        SatIntegrationConfig::save($data);

        return ApiResponse::success(['config' => SatIntegrationConfig::publicView()]);
    }

    public function test(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('sat.manage'), 403);

        $data = $request->validate([
            'api_url' => ['sometimes', 'nullable', 'string', 'max:500'],
            'api_token' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        if (! empty($data['api_url']) || ! empty($data['api_token'])) {
            $saved = SatIntegrationConfig::get();
            $result = $this->sync->pingWithConfig([
                'api_url' => $data['api_url'] ?? $saved['api_url'],
                'api_token' => $data['api_token'] ?? $saved['api_token'],
            ]);
        } else {
            $result = $this->sync->testConnection();
        }

        return $result['ok']
            ? ApiResponse::success($result)
            : ApiResponse::error('connection_failed', $result['message'], 422);
    }

    public function resync(Request $request, SatApplication $satApplication): JsonResponse
    {
        abort_unless($request->user()?->hasPermission('sat.manage'), 403);

        $force = $request->boolean('force', true);
        $ok = $this->sync->syncAcceptedApplication($satApplication->fresh(), $force);

        return ApiResponse::success([
            'synced' => $ok,
            'application' => [
                'id' => $satApplication->id,
                'synced_to_sat_at' => $satApplication->fresh()->synced_to_sat_at?->toIso8601String(),
                'sat_sync_error' => $satApplication->fresh()->sat_sync_error,
            ],
        ]);
    }
}
