<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\TestMelipayamakRequest;
use App\Http\Requests\V1\Admin\UpdateAppSettingsRequest;
use App\Models\AppSetting;
use App\Services\Sms\MelipayamakClient;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $this->authorizeSettings($request);

        return ApiResponse::success($this->publicSettings());
    }

    public function update(UpdateAppSettingsRequest $request): JsonResponse
    {
        $settings = $request->validated('settings');

        if (array_key_exists('melipayamak_password', $settings) && $settings['melipayamak_password'] === '') {
            unset($settings['melipayamak_password']);
        }

        if (array_key_exists('bahram_callback_token', $settings) && $settings['bahram_callback_token'] === '') {
            unset($settings['bahram_callback_token']);
        }

        AppSetting::syncMany($settings);

        return ApiResponse::success($this->publicSettings(), 'تنظیمات ذخیره شد');
    }

    public function testMelipayamak(TestMelipayamakRequest $request, MelipayamakClient $melipayamak): JsonResponse
    {
        $validated = $request->validated();
        $result = $melipayamak->probeCredentials(
            $validated['username'] ?? null,
            $validated['password'] ?? null,
            $validated['rest_url'] ?? null,
        );

        return ApiResponse::success($result);
    }

    private function authorizeSettings(Request $request): void
    {
        abort_unless((bool) $request->user()?->can('admin.settings'), 403, 'اجازه دسترسی ندارید.');
    }

    /**
     * @return array<string, mixed>
     */
    private function publicSettings(): array
    {
        $settings = AppSetting::allKeyed();
        unset($settings['melipayamak_password'], $settings['bahram_callback_token']);
        $settings['melipayamak_password_configured'] = AppSetting::melipayamakPasswordConfigured();
        $settings['bahram_callback_token_configured'] = AppSetting::bahramCallbackTokenConfigured();

        return $settings;
    }
}
