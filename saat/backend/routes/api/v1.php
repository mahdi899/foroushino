<?php

use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\Integrations\InboundApplicationController;
use App\Http\Controllers\Api\V1\MeAvatarController;
use App\Http\Controllers\Api\V1\MeController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);

Route::prefix('integrations/inbound')
    ->middleware('integration.token:inbound:applications')
    ->group(function (): void {
        Route::get('/ping', [InboundApplicationController::class, 'ping']);
        Route::post('/applications', [InboundApplicationController::class, 'store']);
    });

Route::middleware('throttle:auth')->prefix('auth')->group(function (): void {
    Route::get('/demo-accounts', [AuthController::class, 'demoAccounts']);
    Route::post('/telegram', [AuthController::class, 'telegram']);
    Route::post('/telegram-widget', [AuthController::class, 'telegramWidget']);
    Route::post('/telegram-otp/request', [AuthController::class, 'requestTelegramOtp']);
    Route::post('/telegram-otp/verify', [AuthController::class, 'verifyTelegramOtp']);
    Route::post('/phone-otp/request', [AuthController::class, 'requestPhoneOtp']);
    Route::post('/phone-otp/verify', [AuthController::class, 'verifyPhoneOtp']);
    Route::post('/dev-login', [AuthController::class, 'devLogin']);
});

Route::middleware(['auth:sanctum', 'throttle:api'])->group(function (): void {
    Route::get('/me', MeController::class);
    Route::post('/me/avatar', [MeAvatarController::class, 'store']);
    Route::delete('/me/avatar', [MeAvatarController::class, 'destroy']);
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
