<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\SmsEventKey;
use App\Http\Controllers\Controller;
use App\Models\AdminTelegramEventConfig;
use App\Models\SmsEventConfig;
use App\Services\SmsCenterConfigService;
use App\Services\SmsService;
use App\Support\SsrfGuard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SmsCenterConfigController extends Controller
{
    public function __construct(private readonly SmsCenterConfigService $config) {}

    public function show(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()->hasPermission('sms.view') || $request->user()->isSuperAdmin(),
            403,
        );

        return response()->json(['data' => [
            'global' => $this->config->globalView(),
            'providers' => $this->config->providersView(),
            'events' => $this->config->eventsView(),
            'event_categories' => $this->config->eventCategoriesView(),
            'admin_telegram_events' => $this->config->adminTelegramEventsView(),
            'admin_telegram_categories' => $this->config->adminTelegramCategoriesView(),
            'telegram_infrastructure' => $this->config->telegramInfrastructureView(),
            'telegram_worker_sample_template' => $this->config->telegramWorkerSampleTemplate(),
        ]]);
    }

    public function updateGlobal(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()->hasPermission('sms.manage') || $request->user()->isSuperAdmin(),
            403,
        );

        $data = $request->validate([
            'is_sms_active' => ['sometimes', 'boolean'],
            'primary_provider_slug' => ['sometimes', 'string', Rule::exists('sms_providers', 'slug')],
            'fallback_provider_slug' => ['sometimes', 'nullable', 'string', Rule::exists('sms_providers', 'slug')],
            'fallback_delay_seconds' => ['sometimes', 'integer', 'min:5', 'max:300'],
            'fallback_enabled' => ['sometimes', 'boolean'],
            'test_phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'admin_telegram_enabled' => ['sometimes', 'boolean'],
            'admin_telegram_chat_ids' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        return response()->json(['data' => $this->config->updateGlobal($data)]);
    }

    public function updateProvider(Request $request, string $slug): JsonResponse
    {
        abort_unless(
            $request->user()->hasPermission('sms.manage') || $request->user()->isSuperAdmin(),
            403,
        );

        abort_unless(
            \App\Models\SmsProvider::query()->where('slug', $slug)->exists(),
            404,
        );

        $data = $request->validate([
            'sender_number' => ['sometimes', 'nullable', 'string', 'max:50'],
            'base_url' => ['sometimes', 'nullable', 'string', 'max:500'],
            'is_active' => ['sometimes', 'boolean'],
            'credentials_input' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        if (filled($data['base_url'] ?? null)) {
            $urlError = SsrfGuard::validateProviderBaseUrl($slug, $data['base_url']);
            if ($urlError !== null) {
                return response()->json([
                    'error' => ['code' => 'invalid_base_url', 'message_fa' => $urlError],
                ], 422);
            }
        }

        return response()->json(['data' => $this->config->updateProvider($slug, $data)]);
    }

    public function testProvider(Request $request, string $slug): JsonResponse
    {
        abort_unless(
            $request->user()->hasPermission('sms.manage') || $request->user()->isSuperAdmin(),
            403,
        );

        abort_unless(
            \App\Models\SmsProvider::query()->where('slug', $slug)->exists(),
            404,
        );

        $result = $this->config->testProvider($slug);

        return response()->json($result, $result['ok'] ? 200 : 422);
    }

    public function testEvent(Request $request, string $eventKey): JsonResponse
    {
        abort_unless(
            $request->user()->hasPermission('sms.manage') || $request->user()->isSuperAdmin(),
            403,
        );

        abort_unless(
            SmsEventConfig::query()->where('event_key', $eventKey)->exists(),
            404,
        );

        $key = SmsEventKey::tryFrom($eventKey);
        abort_unless($key !== null, 404);

        $data = $request->validate([
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'message_template' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'pattern_code' => ['sometimes', 'nullable', 'string', 'max:100'],
            'use_pattern' => ['sometimes', 'boolean'],
            'provider_slug' => ['sometimes', 'nullable', 'string', Rule::exists('sms_providers', 'slug')],
        ]);

        $result = app(SmsService::class)->sendEventTest($key, $data);

        return response()->json($result, $result['ok'] ? 200 : 422);
    }

    public function updateEvent(Request $request, string $eventKey): JsonResponse
    {
        abort_unless(
            $request->user()->hasPermission('sms.manage') || $request->user()->isSuperAdmin(),
            403,
        );

        $data = $request->validate([
            'is_enabled' => ['sometimes', 'boolean'],
            'message_template' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'pattern_code' => ['sometimes', 'nullable', 'string', 'max:100'],
            'use_pattern' => ['sometimes', 'boolean'],
            'provider_slug' => ['sometimes', 'nullable', 'string', Rule::exists('sms_providers', 'slug')],
            'fallback_enabled' => ['sometimes', 'boolean'],
            'fallback_delay_seconds' => ['sometimes', 'nullable', 'integer', 'min:5', 'max:300'],
        ]);

        return response()->json(['data' => $this->config->updateEvent($eventKey, $data)]);
    }

    public function updateAdminTelegramEvent(Request $request, string $eventKey): JsonResponse
    {
        abort_unless(
            $request->user()->hasPermission('sms.manage') || $request->user()->isSuperAdmin(),
            403,
        );

        abort_unless(
            AdminTelegramEventConfig::query()->where('event_key', $eventKey)->exists(),
            404,
        );

        $data = $request->validate([
            'is_enabled' => ['sometimes', 'boolean'],
        ]);

        return response()->json(['data' => $this->config->updateAdminTelegramEvent($eventKey, $data)]);
    }

    public function testAdminTelegram(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()->hasPermission('sms.manage') || $request->user()->isSuperAdmin(),
            403,
        );

        $result = $this->config->testAdminTelegram();

        return response()->json($result, $result['ok'] ? 200 : 422);
    }
}

