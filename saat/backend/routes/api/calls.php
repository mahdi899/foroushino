<?php

use App\Http\Controllers\Api\V1\Calls\CallController;
use Illuminate\Support\Facades\Route;

Route::prefix('calls')->group(function (): void {
    Route::get('/', [CallController::class, 'index']);
    Route::post('/start', [CallController::class, 'start'])->middleware('throttle:writes');
    Route::get('/{call}', [CallController::class, 'show']);
    Route::post('/{call}/reconcile', [CallController::class, 'reconcile'])->middleware('throttle:writes');
    Route::post('/{call}/result', [CallController::class, 'submitResult'])
        ->middleware(['throttle:writes', 'idempotent']);
});
