<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\IdentityCapability;
use App\Enums\ProviderConnectionStatus;
use App\Http\Controllers\Controller;
use App\Models\IdentityProviderConfig;
use App\Models\IdentityVerificationRoute;
use App\Services\AdminAuditLogger;
use App\Services\Identity\IdentityVerificationProviderRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class IdentityProviderAdminController extends Controller
{
    public function __construct(
        private readonly IdentityVerificationProviderRegistry $registry,
        private readonly AdminAuditLogger $audit,
    ) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermission('identity_provider.view'), 403);

        $routes = IdentityVerificationRoute::query()->orderBy('capability')->get();
        $configs = IdentityProviderConfig::query()->orderBy('slug')->get()->keyBy('slug');

        $providers = collect($this->registry->all())->map(function (object $provider) use ($configs) {
            $slug = $provider->slug();
            $config = $configs->get($slug);

            return [
                'slug' => $slug,
                'label' => $config?->label ?? $slug,
                'capabilities' => array_map(
                    fn ($c) => $c instanceof IdentityCapability ? $c->value : (string) $c,
                    $provider->capabilities(),
                ),
                'is_configured' => $provider->isConfigured(),
                'is_enabled' => (bool) ($config?->is_enabled ?? false),
                'credentials_configured' => (bool) ($config?->hasCredentials() ?? false),
                'settings' => $this->publicSettings($config?->settings),
                'last_test_status' => $config?->last_test_status,
                'last_tested_at' => $config?->last_tested_at?->toIso8601String(),
                'last_test_message' => $config?->last_test_message,
            ];
        })->values();

        return response()->json(['data' => [
            'routes' => $routes->map(fn (IdentityVerificationRoute $r) => [
                'id' => $r->id,
                'capability' => $r->capability->value,
                'primary_provider' => $r->primary_provider,
                'fallback_provider' => $r->fallback_provider,
                'is_active' => $r->is_active,
            ]),
            'providers' => $providers,
        ]]);
    }

    public function updateRoute(Request $request, IdentityVerificationRoute $route): JsonResponse
    {
        abort_unless($request->user()->hasPermission('identity_provider.manage'), 403);

        $data = $request->validate([
            'primary_provider' => ['required', 'string', 'max:80'],
            'fallback_provider' => ['nullable', 'string', 'max:80'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $route->update($data);

        $this->audit->log($request->user(), 'identity_provider.route_updated', $route, [
            'capability' => $route->capability->value,
            'primary_provider' => $route->primary_provider,
            'fallback_provider' => $route->fallback_provider,
        ]);

        return response()->json(['data' => $route]);
    }

    public function updateProvider(Request $request, string $slug): JsonResponse
    {
        abort_unless($request->user()->hasPermission('identity_provider.manage'), 403);

        $provider = $this->registry->resolve($slug);
        $config = IdentityProviderConfig::query()->firstOrCreate(
            ['slug' => $slug],
            [
                'label' => $slug,
                'capabilities' => array_map(
                    fn ($c) => $c instanceof IdentityCapability ? $c->value : (string) $c,
                    $provider->capabilities(),
                ),
                'is_enabled' => false,
            ],
        );

        $data = $request->validate([
            'label' => ['sometimes', 'string', 'max:120'],
            'is_enabled' => ['sometimes', 'boolean'],
            'settings' => ['sometimes', 'array'],
            'credentials' => ['sometimes', 'array'],
        ]);

        if (isset($data['label'])) {
            $config->label = $data['label'];
        }
        if (array_key_exists('is_enabled', $data)) {
            $config->is_enabled = (bool) $data['is_enabled'];
        }
        if (isset($data['settings'])) {
            $config->settings = array_merge($config->settings ?? [], $data['settings']);
        }
        if (isset($data['credentials']) && is_array($data['credentials'])) {
            $existing = $config->getCredentials();
            $merged = $existing;
            foreach ($data['credentials'] as $key => $value) {
                if ($value === null || $value === '' || $value === '********') {
                    continue;
                }
                $merged[$key] = $value;
            }
            $config->setCredentials($merged);
        }

        $config->save();

        $this->audit->log($request->user(), 'identity_provider.config_updated', $config, [
            'slug' => $slug,
            'is_enabled' => $config->is_enabled,
            'credentials_updated' => isset($data['credentials']),
        ]);

        return response()->json(['data' => [
            'slug' => $config->slug,
            'label' => $config->label,
            'is_enabled' => $config->is_enabled,
            'credentials_configured' => $config->hasCredentials(),
            'settings' => $this->publicSettings($config->settings),
        ]]);
    }

    public function testConnection(Request $request, string $slug): JsonResponse
    {
        abort_unless($request->user()->hasPermission('identity_provider.test'), 403);

        $provider = $this->registry->resolve($slug);

        try {
            $result = $provider->testConnection();
        } catch (Throwable $e) {
            $result = new \App\Services\Identity\DTOs\ProviderConnectionResult(
                ProviderConnectionStatus::ProviderUnavailable,
                $e->getMessage() ?: 'خطای ناشناخته',
            );
        }

        $config = IdentityProviderConfig::query()->where('slug', $slug)->first();
        if ($config) {
            $config->update([
                'last_test_status' => $result->status->value,
                'last_tested_at' => now(),
                'last_test_message' => $result->message,
            ]);
        }

        $this->audit->log($request->user(), 'identity_provider.tested', $config, [
            'slug' => $slug,
            'status' => $result->status->value,
        ]);

        return response()->json(['data' => $result->toArray()]);
    }

    /**
     * @param  array<string, mixed>|null  $settings
     * @return array<string, mixed>
     */
    private function publicSettings(?array $settings): array
    {
        if (! is_array($settings)) {
            return [];
        }

        $blocked = ['business_token', 'api_token', 'token', 'secret', 'password'];
        $clean = [];
        foreach ($settings as $key => $value) {
            if (in_array(strtolower((string) $key), $blocked, true)) {
                continue;
            }
            $clean[$key] = $value;
        }

        return $clean;
    }
}
