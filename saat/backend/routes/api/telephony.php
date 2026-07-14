<?php

use App\Http\Controllers\Api\V1\Telephony\TelephonyController;
use Illuminate\Support\Facades\Route;

Route::prefix('telephony')->group(function (): void {
    Route::get('/capabilities', [TelephonyController::class, 'capabilities']);
    Route::get('/health', [TelephonyController::class, 'health']);
    Route::post('/test-connection', [TelephonyController::class, 'testConnection'])->middleware('throttle:writes');
});
