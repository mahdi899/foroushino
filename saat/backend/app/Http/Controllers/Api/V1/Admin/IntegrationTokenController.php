<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Models\IntegrationToken;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class IntegrationTokenController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $tokens = IntegrationToken::query()
            ->with('creator:id,name')
            ->orderByDesc('id')
            ->get()
            ->map(fn (IntegrationToken $token) => [
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

    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
        ]);

        $plain = 'saat_'.Str::random(48);
        $token = IntegrationToken::query()->create([
            'name' => $data['name'],
            'token_hash' => hash('sha256', $plain),
            'abilities' => ['inbound:applications'],
            'created_by' => $request->user()->id,
        ]);

        return ApiResponse::success([
            'token' => [
                'id' => $token->id,
                'name' => $token->name,
                'plain_text' => $plain,
            ],
            'inbound_applications_url' => url('/api/v1/integrations/inbound/applications'),
            'inbound_ping_url' => url('/api/v1/integrations/inbound/ping'),
        ], message: 'توکن فقط یک‌بار نمایش داده می‌شود.', status: 201);
    }

    public function destroy(Request $request, IntegrationToken $integrationToken): JsonResponse
    {
        $this->authorizeAdmin($request);

        $integrationToken->update(['revoked_at' => now()]);

        return response()->json(null, 204);
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless(
            $request->user()?->hasRole(RoleName::Admin->value),
            403,
            'فقط ادمین کل می‌تواند توکن اتصال بسازد.'
        );
    }
}
