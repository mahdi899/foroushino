<?php

use App\Http\Controllers\Api\ArticleController;
use App\Http\Controllers\Api\ChatbotController;
use App\Http\Controllers\Api\FaqController;
use App\Http\Controllers\Api\LeadController;
use App\Http\Controllers\Api\MediaAltController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ZarinpalController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::prefix('v1')->group(base_path('routes/api_v1.php'));

/*
|--------------------------------------------------------------------------
| Public API (consumed by the Next.js frontend)
|--------------------------------------------------------------------------
*/

// FAQ
Route::get('/faqs', [FaqController::class, 'index']);

// Media alt (public SEO / accessibility lookup)
Route::get('/media/alt', [MediaAltController::class, 'show'])->middleware('throttle:120,1');

// Articles
Route::get('/articles', [ArticleController::class, 'index']);
Route::get('/articles/{slug}', [ArticleController::class, 'show']);

// Products
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{slug}', [ProductController::class, 'show']);

// Orders
Route::post('/orders', [OrderController::class, 'store']);

// Payments (Zarinpal)
Route::post('/payments/zarinpal/request', [ZarinpalController::class, 'request']);
Route::get('/payments/zarinpal/callback', [ZarinpalController::class, 'callback'])->name('api.payments.zarinpal.callback');

// Leads
Route::post('/leads', [LeadController::class, 'store'])->middleware('throttle:leads');

// Chatbot
Route::get('/chatbot/settings', [ChatbotController::class, 'settings']);
Route::post('/chatbot/message', [ChatbotController::class, 'message'])->middleware('throttle:chatbot');
