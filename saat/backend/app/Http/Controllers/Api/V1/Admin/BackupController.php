<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Services\BackupService;
use App\Services\DownloadHostBackupService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class BackupController extends Controller
{
    public function __construct(
        private readonly BackupService $backup,
        private readonly DownloadHostBackupService $downloadHostBackup,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $this->authorizeBackup($request);

        return ApiResponse::success(array_merge(
            $this->backup->adminView(),
            $this->downloadHostBackup->adminSnapshot(),
        ));
    }

    public function update(Request $request): JsonResponse
    {
        $this->authorizeBackup($request);

        $validated = $request->validate([
            'is_auto_enabled' => ['sometimes', 'boolean'],
            'schedule_time' => ['sometimes', 'string', 'regex:/^\d{2}:\d{2}$/'],
            'retention_count' => ['sometimes', 'integer', 'min:1', 'max:30'],
        ]);

        return ApiResponse::success($this->backup->update($validated), 'تنظیمات بکاپ ذخیره شد.');
    }

    public function run(Request $request): JsonResponse
    {
        $this->authorizeBackup($request);

        $result = $this->backup->runBackup();

        return ApiResponse::success($result, $result['message'], $result['ok'] ? 200 : 422);
    }

    public function exportDatabase(Request $request): BinaryFileResponse|JsonResponse
    {
        $this->authorizeBackup($request);

        try {
            $artifact = $this->backup->createDumpArtifact();
        } catch (\Throwable $e) {
            return ApiResponse::error($e->getMessage(), null, 422);
        }

        return response()->download($artifact['path'], $artifact['filename'], [
            'Content-Type' => 'application/gzip',
        ])->deleteFileAfterSend(false);
    }

    public function exportStorage(Request $request): BinaryFileResponse|JsonResponse
    {
        $this->authorizeBackup($request);

        try {
            $artifact = $this->backup->createStorageArtifact();
        } catch (\Throwable $e) {
            return ApiResponse::error($e->getMessage(), null, 422);
        }

        return response()->download($artifact['path'], $artifact['filename'], [
            'Content-Type' => 'application/zip',
        ])->deleteFileAfterSend(false);
    }

    public function importDatabase(Request $request): JsonResponse
    {
        $this->authorizeBackup($request);

        $request->validate([
            'confirm' => ['required', 'string', 'in:RESTORE'],
            'file' => ['required', 'file', 'max:102400'],
        ]);

        try {
            $this->backup->restoreUploadedFile($request->file('file'));
        } catch (\Throwable $e) {
            return ApiResponse::error($e->getMessage(), null, 422);
        }

        return ApiResponse::success([
            'ok' => true,
            'message' => 'دیتابیس با موفقیت بازیابی شد.',
        ], 'دیتابیس با موفقیت بازیابی شد.');
    }

    public function uploadDownloadHost(Request $request): JsonResponse
    {
        $this->authorizeBackup($request);

        $result = $this->downloadHostBackup->uploadWeeklyBackup(true);

        return ApiResponse::success(
            array_merge($result, $this->downloadHostBackup->adminSnapshot()),
            $result['message'],
            $result['ok'] ? 200 : 422,
        );
    }

    private function authorizeBackup(Request $request): void
    {
        abort_unless((bool) $request->user()?->can('admin.settings'), 403, 'اجازه دسترسی ندارید.');
    }
}
