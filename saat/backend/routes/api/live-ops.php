<?php

use App\Http\Controllers\Api\V1\LiveOps\LiveOpsController;
use Illuminate\Support\Facades\Route;

Route::prefix('live-ops')->group(function (): void {
    Route::get('/dashboard', [LiveOpsController::class, 'dashboard']);
});
