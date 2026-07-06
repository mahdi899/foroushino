<?php

use App\Http\Controllers\Api\V1\Leads\LeadController;
use Illuminate\Support\Facades\Route;

Route::prefix('leads')->group(function (): void {
    Route::get('/', [LeadController::class, 'index']);
    Route::post('/next', [LeadController::class, 'next'])->middleware('throttle:writes');
    Route::get('/locked', [LeadController::class, 'locked']);
    Route::get('/returned', [LeadController::class, 'returned']);
    Route::post('/auto-assign', [LeadController::class, 'autoAssign'])->middleware('throttle:writes');
    Route::post('/import', [LeadController::class, 'import'])->middleware('throttle:writes');
    Route::get('/import/{importBatch}', [LeadController::class, 'importBatch']);
    Route::get('/{lead}', [LeadController::class, 'show']);
    Route::post('/{lead}/lock', [LeadController::class, 'lock'])->middleware('throttle:writes');
    Route::post('/{lead}/release', [LeadController::class, 'release'])->middleware('throttle:writes');
    Route::post('/{lead}/return-to-pool', [LeadController::class, 'returnToPool'])->middleware('throttle:writes');
    Route::post('/{lead}/reclaim', [LeadController::class, 'reclaim'])->middleware('throttle:writes');
});
