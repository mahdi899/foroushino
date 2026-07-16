<?php

use App\Modules\TelegramBot\Http\Controllers\Admin\TelegramHealthAdminController;
use App\Modules\TelegramBot\Http\Controllers\IdentityStatusController;
use App\Modules\TelegramBot\Http\Controllers\MiniAppAuthController;
use App\Modules\TelegramBot\Http\Controllers\WebhookController;
use Illuminate\Support\Facades\Route;

Route::post(
    '/api/v1/integrations/telegram/{botKey}/webhook',
    WebhookController::class,
)->middleware(['telegram.webhook', 'throttle:120,1']);

Route::post('/api/v1/telegram/miniapp/auth', MiniAppAuthController::class)
    ->middleware('throttle:30,1');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/api/v1/telegram/identity/status', [IdentityStatusController::class, 'status']);

    Route::middleware('admin')->group(function (): void {
        Route::get('/api/v1/panel/telegram/health', TelegramHealthAdminController::class);
    });
});

Route::post('/api/v1/telegram/identity/session', [IdentityStatusController::class, 'session'])
    ->middleware('throttle:20,1');
