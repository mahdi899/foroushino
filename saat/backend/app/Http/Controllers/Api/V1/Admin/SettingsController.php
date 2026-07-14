<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Admin\UpdateAppSettingsRequest;
use App\Models\AppSetting;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $this->authorizeSettings($request);

        return ApiResponse::success(AppSetting::allKeyed());
    }

    public function update(UpdateAppSettingsRequest $request): JsonResponse
    {
        AppSetting::syncMany($request->validated('settings'));

        return ApiResponse::success(AppSetting::allKeyed(), 'تنظیمات ذخیره شد');
    }

    private function authorizeSettings(Request $request): void
    {
        abort_unless((bool) $request->user()?->can('admin.settings'), 403, 'اجازه دسترسی ندارید.');
    }
}
