<?php

use App\Http\Controllers\Api\V1\Quality\QualityReviewController;
use Illuminate\Support\Facades\Route;

Route::prefix('quality')->group(function (): void {
    Route::get('/reviews', [QualityReviewController::class, 'index']);
    Route::patch('/reviews/{qualityReview}', [QualityReviewController::class, 'update'])->middleware('throttle:writes');
    Route::get('/coaching-tasks', [QualityReviewController::class, 'coachingTasks']);
    Route::post('/coaching-tasks', [QualityReviewController::class, 'storeCoachingTask'])->middleware('throttle:writes');
    Route::patch('/coaching-tasks/{coachingTask}', [QualityReviewController::class, 'updateCoachingTask'])->middleware('throttle:writes');
});
