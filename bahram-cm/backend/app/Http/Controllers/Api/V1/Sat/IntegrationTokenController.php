<?php

namespace App\Http\Controllers\Api\V1\Sat;

use App\Http\Controllers\Controller;
use App\Models\SatIntegrationToken;
use App\Services\Sat\SatAccessService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class IntegrationTokenController extends Controller
{
    public function __construct(private readonly SatAccessService $access) {}

    public function index(Request $request): JsonResponse
    {
        $actor = $request->user();
        abort_unless($this->access->isSatSuperAdmin($actor), 403);

        $tokens = SatIntegrationToken::query()
            ->with('creator:id,name')
            ->orderByDesc('id')
            ->get()
            ->map(fn (SatIntegrationToken $token) => [
                'id' => $token->id,
                'name' => $token->name,
                'abilities' => $token->abilities,
                'created_by_name' => $token->creator?->name,
                'last_used_at' => $token->last_used_at?->toIso8601String(),
                'revoked_at' => $token->revoked_at?->toIso8601String(),
                'created_at' => $token->created_at?->toIso8601String(),
            ]);

        return ApiResponse::success([
            'tokens' => $tokens,
            'inbound_applications_url' => url('/api/v1/integrations/inbound/applications'),
            'inbound_ping_url' => url('/api/v1/integrations/inbound/ping'),
        ]);
    }

    private const ALLOWED_ABILITIES = ['inbound:applications', 'callback:lead-status'];

    public function store(Request $request): JsonResponse
    {
        $actor = $request->user();
        abort_unless($this->access->isSatSuperAdmin($actor), 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'abilities' => ['nullable', 'array'],
            'abilities.*' => ['string', 'in:'.implode(',', self::ALLOWED_ABILITIES)],
        ]);

        $abilities = ! empty($data['abilities']) ? array_values(array_unique($data['abilities'])) : ['inbound:applications'];

        $plain = 'sat_'.Str::random(48);
        $token = SatIntegrationToken::query()->create([
            'name' => $data['name'],
            'token_hash' => hash('sha256', $plain),
            'abilities' => $abilities,
            'created_by' => $actor->id,
        ]);

        return ApiResponse::success([
            'token' => [
                'id' => $token->id,
                'name' => $token->name,
                'plain_text' => $plain,
                'abilities' => $token->abilities,
            ],
            'inbound_applications_url' => url('/api/v1/integrations/inbound/applications'),
            'message_fa' => 'توکن فقط یک‌بار نمایش داده می‌شود. آن را در پنل بهرام ذخیره کنید.',
        ], 201);
    }

    public function destroy(Request $request, SatIntegrationToken $integrationToken): JsonResponse
    {
        $actor = $request->user();
        abort_unless($this->access->isSatSuperAdmin($actor), 403);

        $integrationToken->update(['revoked_at' => now()]);

        return response()->json(null, 204);
    }
}
