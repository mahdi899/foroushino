<?php

use App\Http\Controllers\Api\V1\Gamification\GamificationController;
use Illuminate\Support\Facades\Route;

Route::prefix('gamification')->group(function (): void {
    Route::get('/achievements', [GamificationController::class, 'achievements']);
    Route::get('/leaderboard', [GamificationController::class, 'leaderboard']);
});
