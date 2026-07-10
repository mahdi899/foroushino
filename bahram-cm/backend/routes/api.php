<?php

use App\Http\Controllers\Api\ArticleController;
use App\Http\Controllers\Api\ChatbotController;
use App\Http\Controllers\Api\FaqController;
use App\Http\Controllers\Api\StudentTestimonialController;
use App\Http\Controllers\Api\LeadController;
use App\Http\Controllers\Api\MiniCourseCommentController;
use App\Http\Controllers\Api\MiniCourseController;
use App\Http\Controllers\Api\MediaAltController;
use App\Http\Controllers\Api\DiscountCodeController;
use App\Http\Controllers\Api\GuestCheckoutController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\PublicSeminarController;
use App\Http\Controllers\Api\SeminarPromoController;
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

// Student testimonials (transformations / case studies)
Route::get('/transformations', [StudentTestimonialController::class, 'index']);
Route::get('/transformations/{slug}', [StudentTestimonialController::class, 'show'])->where('slug', '[^/]+');

// Media alt (public SEO / accessibility lookup)
Route::get('/media/alt', [MediaAltController::class, 'show'])->middleware('throttle:120,1');

// Articles
Route::get('/articles', [ArticleController::class, 'index']);
Route::get('/articles/{slug}', [ArticleController::class, 'show']);

// Products
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{slug}', [ProductController::class, 'show']);

// Mini courses (free Aparat videos)
Route::get('/mini-courses', [MiniCourseController::class, 'index']);
Route::get('/mini-courses/{slug}', [MiniCourseController::class, 'show'])->where('slug', '[^/]+');
Route::get('/mini-courses/{slug}/comments', [MiniCourseController::class, 'comments'])->where('slug', '[^/]+');
Route::post('/mini-courses/{slug}/comments', [MiniCourseCommentController::class, 'store'])
    ->where('slug', '[^/]+')
    ->middleware('throttle:leads');

// Seminar promo banner (site-wide)
Route::get('/seminars/promo', [SeminarPromoController::class, 'active']);
Route::get('/seminars/{slug}', [PublicSeminarController::class, 'show'])->where('slug', '[^/]+');

// Orders
Route::post('/orders', [OrderController::class, 'store']);
Route::post('/discount-codes/validate', [DiscountCodeController::class, 'validateCode'])
    ->middleware('throttle:30,1');
Route::get('/orders/complete-profile', [OrderController::class, 'completeProfileContext'])
    ->middleware('throttle:30,1');
Route::get('/orders/payment-result', [OrderController::class, 'paymentResult'])
    ->middleware('throttle:30,1');
Route::post('/orders/payment-result/login', [OrderController::class, 'paymentResultLogin'])
    ->middleware('throttle:20,1');
Route::post('/orders/complete-customer', [OrderController::class, 'completeCustomer'])
    ->middleware('throttle:20,1');
Route::post('/orders/guest-checkout/send-otp', [GuestCheckoutController::class, 'sendOtp'])
    ->middleware('throttle:10,1');
Route::post('/orders/guest-checkout/resend-otp', [GuestCheckoutController::class, 'resendOtp'])
    ->middleware('throttle:10,1');
Route::post('/orders/guest-checkout/verify-and-pay', [GuestCheckoutController::class, 'verifyAndPay'])
    ->middleware('throttle:20,1');
Route::post('/orders/post-payment-login/resend-otp', [OrderController::class, 'postPaymentResendOtp'])
    ->middleware('throttle:10,1');
Route::post('/orders/post-payment-login/verify-otp', [OrderController::class, 'postPaymentVerifyOtp'])
    ->middleware('throttle:20,1');

// Payments (Zarinpal)
Route::post('/payments/zarinpal/request', [ZarinpalController::class, 'request']);
Route::get('/payments/zarinpal/callback', [ZarinpalController::class, 'callback'])->name('api.payments.zarinpal.callback');

// Leads
Route::post('/leads', [LeadController::class, 'store'])->middleware('throttle:leads');

// Chatbot
Route::get('/chatbot/settings', [ChatbotController::class, 'settings']);
Route::post('/chatbot/message', [ChatbotController::class, 'message'])->middleware('throttle:chatbot');
