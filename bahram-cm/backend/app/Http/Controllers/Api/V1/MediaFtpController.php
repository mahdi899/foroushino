<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\MediaResource;
use App\Models\Media;
use App\Services\Media\FtpMediaManager;
use App\Support\ApiResponse;
use App\Support\MediaFtpConnection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Admin panel controls for the media library's download host: connection
 * settings, connectivity test, directory listing, and two-way transfer
 * (push to remote / pull back to Server 1) or remote-only deletion.
 */
class MediaFtpController extends Controller
{
    public function __construct(private readonly FtpMediaManager $manager) {}

    public function connection(): JsonResponse
    {
        return ApiResponse::success(['connection' => MediaFtpConnection::publicView()]);
    }

    public function updateConnection(Request $request): JsonResponse
    {
        $data = $request->validate([
            'enabled' => ['nullable', 'boolean'],
            'protocol' => ['nullable', Rule::in(['ftp', 'sftp'])],
            'host' => ['nullable', 'string', 'max:255'],
            'port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'username' => ['nullable', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'max:255'],
            'root' => ['nullable', 'string', 'max:255'],
            'passive' => ['nullable', 'boolean'],
            'ssl' => ['nullable', 'boolean'],
            'timeout' => ['nullable', 'integer', 'min:5', 'max:300'],
            'private_key' => ['nullable', 'string', 'max:8192'],
        ]);

        MediaFtpConnection::save($data);

        return ApiResponse::success(['connection' => MediaFtpConnection::publicView()]);
    }

    public function testConnection(): JsonResponse
    {
        return ApiResponse::success($this->manager->testConnection());
    }

    public function list(Request $request): JsonResponse
    {
        $data = $request->validate([
            'path' => ['nullable', 'string', 'max:1024'],
        ]);

        try {
            return ApiResponse::success($this->manager->listRemote((string) ($data['path'] ?? '')));
        } catch (\Throwable $e) {
            return ApiResponse::error('ftp_unavailable', 'دریافت لیست فایل‌ها از هاست دانلود با خطا مواجه شد.', 502);
        }
    }

    public function push(Media $medium): JsonResponse
    {
        try {
            $medium = $this->manager->push($medium);
        } catch (\RuntimeException $e) {
            return ApiResponse::error('ftp_push_failed', $e->getMessage(), 422);
        } catch (\Throwable) {
            return ApiResponse::error('ftp_push_failed', 'انتقال فایل به هاست دانلود با خطا مواجه شد.', 502);
        }

        return ApiResponse::success(['media' => new MediaResource($medium)]);
    }

    public function pull(Media $medium): JsonResponse
    {
        try {
            $medium = $this->manager->pull($medium);
        } catch (\RuntimeException $e) {
            return ApiResponse::error('ftp_pull_failed', $e->getMessage(), 422);
        } catch (\Throwable) {
            return ApiResponse::error('ftp_pull_failed', 'بازگرداندن فایل از هاست دانلود با خطا مواجه شد.', 502);
        }

        return ApiResponse::success(['media' => new MediaResource($medium)]);
    }

    public function destroyRemote(Request $request): JsonResponse
    {
        $data = $request->validate([
            'path' => ['required', 'string', 'max:1024'],
        ]);

        try {
            $deleted = $this->manager->deleteRemote($data['path']);
        } catch (\Throwable) {
            return ApiResponse::error('ftp_delete_failed', 'حذف فایل از هاست دانلود با خطا مواجه شد.', 502);
        }

        if (! $deleted) {
            return ApiResponse::error('not_found', 'فایل موردنظر روی هاست دانلود یافت نشد.', 404);
        }

        return ApiResponse::success(['deleted' => true]);
    }

    public function sync(Request $request): JsonResponse
    {
        $data = $request->validate([
            'limit' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        try {
            $result = $this->manager->syncLocalToRemote((int) ($data['limit'] ?? 50));
        } catch (\RuntimeException $e) {
            return ApiResponse::error('ftp_sync_failed', $e->getMessage(), 422);
        } catch (\Throwable) {
            return ApiResponse::error('ftp_sync_failed', 'همگام‌سازی با هاست دانلود با خطا مواجه شد.', 502);
        }

        return ApiResponse::success($result);
    }
}
