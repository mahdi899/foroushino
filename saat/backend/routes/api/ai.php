<?php

use App\Http\Controllers\Api\V1\Ai\AiAssistController;
use Illuminate\Support\Facades\Route;

Route::prefix('ai')->group(function (): void {
    Route::post('/leads/{lead}/score', [AiAssistController::class, 'scoreLead'])->middleware('throttle:writes');
    Route::post('/call-summary', [AiAssistController::class, 'callSummary'])->middleware('throttle:writes');
});
