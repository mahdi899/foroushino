<?php

use App\Http\Controllers\Api\V1\Reports\ReportsController;
use Illuminate\Support\Facades\Route;

Route::prefix('reports')->group(function (): void {
    Route::get('/pipeline', [ReportsController::class, 'pipeline']);
    Route::get('/sources', [ReportsController::class, 'sources']);
    Route::get('/weak-agents', [ReportsController::class, 'weakAgents']);
    Route::get('/overdue', [ReportsController::class, 'overdue']);
    Route::get('/suspicious', [ReportsController::class, 'suspicious']);
});
