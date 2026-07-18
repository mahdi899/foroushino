<?php

use App\Http\Controllers\Api\V1\Team\TeamController;
use Illuminate\Support\Facades\Route;

Route::prefix('team')->group(function (): void {
    Route::get('/live', [TeamController::class, 'live']);
    Route::get('/roster', [TeamController::class, 'roster']);
});
