<?php

use App\Http\Controllers\Api\V1\FollowUps\FollowUpController;
use Illuminate\Support\Facades\Route;

Route::prefix('followups')->group(function (): void {
    Route::get('/', [FollowUpController::class, 'index']);
    Route::post('/', [FollowUpController::class, 'store'])->middleware('throttle:writes');
    Route::post('/{followUp}/complete', [FollowUpController::class, 'complete'])->middleware('throttle:writes');
    Route::post('/{followUp}/snooze', [FollowUpController::class, 'snooze'])->middleware('throttle:writes');
    Route::post('/{followUp}/cancel', [FollowUpController::class, 'cancel'])->middleware('throttle:writes');
});
