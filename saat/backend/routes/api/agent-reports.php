<?php

use App\Http\Controllers\Api\V1\Reports\AgentReportController;
use Illuminate\Support\Facades\Route;

Route::prefix('agent-reports')->group(function (): void {
    Route::get('/', [AgentReportController::class, 'index']);
    Route::post('/', [AgentReportController::class, 'store']);
    Route::post('/{agentReport}/approve', [AgentReportController::class, 'approve']);
    Route::post('/{agentReport}/reject', [AgentReportController::class, 'reject']);
});
