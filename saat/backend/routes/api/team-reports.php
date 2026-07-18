<?php

use App\Http\Controllers\Api\V1\Reports\TeamReportController;
use Illuminate\Support\Facades\Route;

Route::prefix('team-reports')->group(function (): void {
    Route::get('/', [TeamReportController::class, 'index']);
    Route::post('/', [TeamReportController::class, 'store']);
    Route::patch('/{teamReport}', [TeamReportController::class, 'update']);
    Route::post('/{teamReport}/approve', [TeamReportController::class, 'approve']);
    Route::post('/{teamReport}/forward', [TeamReportController::class, 'forward']);
});
