<?php

use App\Http\Controllers\Api\V1\Telephony\TelephonyController;
use App\Http\Controllers\Api\V1\Telephony\TelephonyWebhookController;
use Illuminate\Support\Facades\Route;

Route::prefix('telephony')->group(function (): void {
    Route::get('/capabilities', [TelephonyController::class, 'capabilities']);
    Route::get('/health', [TelephonyController::class, 'health']);
    Route::post('/test-connection', [TelephonyController::class, 'testConnection'])->middleware('throttle:writes');
    Route::post('/webhook/{provider?}', TelephonyWebhookController::class)->middleware('throttle:api');
});
