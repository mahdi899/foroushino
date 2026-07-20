<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\DatabaseBackupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DatabaseBackupSettingsController extends Controller
{
    public function __construct(private readonly DatabaseBackupService $backup) {}

    public function show(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        return response()->json(['data' => $this->backup->adminView()]);
    }

    public function update(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $validated = $request->validate([
            'is_auto_enabled' => ['sometimes', 'boolean'],
            'schedule_time' => ['sometimes', 'string', 'regex:/^\d{2}:\d{2}$/'],
            'send_to_telegram' => ['sometimes', 'boolean'],
            'retention_count' => ['sometimes', 'integer', 'min:1', 'max:30'],
        ]);

        return response()->json(['data' => $this->backup->update($validated)]);
    }

    public function run(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $validated = $request->validate([
            'send_to_telegram' => ['sometimes', 'boolean'],
        ]);

        $result = $this->backup->runBackup((bool) ($validated['send_to_telegram'] ?? true));

        return response()->json(['data' => $result], $result['ok'] ? 200 : 422);
    }

    public function export(Request $request): BinaryFileResponse|JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        try {
            $artifact = $this->backup->createDumpArtifact();
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->download($artifact['path'], $artifact['filename'], [
            'Content-Type' => 'application/gzip',
        ])->deleteFileAfterSend(false);
    }

    public function exportMedia(Request $request): BinaryFileResponse|JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        try {
            $artifact = $this->backup->createMediaArtifact();
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->download($artifact['path'], $artifact['filename'], [
            'Content-Type' => 'application/zip',
        ])->deleteFileAfterSend(false);
    }

    public function import(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $request->validate([
            'confirm' => ['required', 'string', 'in:RESTORE'],
            'file' => ['required', 'file', 'max:102400'],
        ]);

        try {
            $this->backup->restoreUploadedFile($request->file('file'));
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'data' => [
                'ok' => true,
                'message' => 'دیتابیس با موفقیت بازیابی شد.',
            ],
        ]);
    }

    public function testTelegram(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $result = $this->backup->testTelegram();

        return response()->json(['data' => $result], $result['ok'] ? 200 : 422);
    }

    private function authorizeSuperAdmin(Request $request): void
    {
        abort_unless($request->user()?->isSuperAdmin(), 403);
    }
}
