<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Throwable;

class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $database = $this->checkDatabase();
        $redis = $this->checkRedis();

        return ApiResponse::success(
            data: [
                'app' => config('app.name'),
                'database' => $database,
                'redis' => $redis,
                'queue' => config('queue.default'),
                'broadcast' => config('broadcasting.default'),
            ],
            message: 'Saat backend is running',
        );
    }

    private function checkDatabase(): string
    {
        try {
            DB::connection()->getPdo();

            return 'connected';
        } catch (Throwable) {
            return 'disconnected';
        }
    }

    private function checkRedis(): string
    {
        try {
            Redis::connection()->ping();

            return 'connected';
        } catch (Throwable) {
            return 'disconnected';
        }
    }
}
