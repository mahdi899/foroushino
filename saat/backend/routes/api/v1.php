<?php

use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\MeController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);

Route::middleware('throttle:auth')->prefix('auth')->group(function (): void {
    Route::post('/telegram', [AuthController::class, 'telegram']);
    Route::post('/dev-login', [AuthController::class, 'devLogin']);
});

Route::middleware(['auth:sanctum', 'throttle:api'])->group(function (): void {
    Route::get('/me', MeController::class);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    require __DIR__.'/leads.php';
    require __DIR__.'/calls.php';
    require __DIR__.'/followups.php';
    require __DIR__.'/sales.php';
    require __DIR__.'/wallet.php';
    require __DIR__.'/home.php';
    require __DIR__.'/misc.php';
    require __DIR__.'/reports.php';
    require __DIR__.'/gamification.php';
    require __DIR__.'/admin.php';
});
