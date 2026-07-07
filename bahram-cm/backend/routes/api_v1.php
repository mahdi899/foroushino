<?php

use App\Http\Controllers\Admin\LeadExportController;
use App\Http\Controllers\Admin\OrderExportController;
use App\Http\Controllers\Api\V1\ArticleAdminController;
use App\Http\Controllers\Api\V1\ArticleRevisionController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CaptchaController;
use App\Http\Controllers\Api\V1\CacheController;
use App\Http\Controllers\Api\V1\ChatbotController;
use App\Http\Controllers\Api\V1\CommercePaymentSettingsController;
use App\Http\Controllers\Api\V1\CommerceSmsSpotplayerController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\FaqController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\ImageOptimizerSettingsController;
use App\Http\Controllers\Api\V1\MediaConfigController;
use App\Http\Controllers\Api\V1\MediaController;
use App\Http\Controllers\Api\V1\MediaOptimizeController;
use App\Http\Controllers\Api\V1\SettingController;
use App\Http\Controllers\Api\V1\StudentTestimonialController;
use Illuminate\Support\Facades\Route;

Route::post('auth/login', [AuthController::class, 'login']);

Route::get('media/config', [MediaConfigController::class, 'config']);
Route::get('media/optimize-preview/{session}/{variant}', [MediaOptimizeController::class, 'previewFile'])
    ->name('media.optimize.preview');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('auth/me', [AuthController::class, 'me']);

    Route::get('panel/articles', [ArticleAdminController::class, 'index']);
    Route::get('panel/articles/trash', [ArticleAdminController::class, 'trashIndex']);
    Route::get('panel/articles/{article:id}', [ArticleAdminController::class, 'show'])->whereNumber('article');
    Route::post('articles', [ArticleAdminController::class, 'store']);
    Route::get('articles/{slug}', [ArticleAdminController::class, 'showBySlug'])->where('slug', '[^/]+');
    Route::patch('articles/{article:id}', [ArticleAdminController::class, 'update'])->whereNumber('article');
    Route::delete('articles/{article:id}', [ArticleAdminController::class, 'destroy'])->whereNumber('article');
    Route::post('articles/{article:id}/restore', [ArticleAdminController::class, 'restore'])->whereNumber('article');
    Route::get('articles/{article:id}/revisions', [ArticleRevisionController::class, 'index'])->whereNumber('article');
    Route::post('articles/{article:id}/revisions', [ArticleRevisionController::class, 'store'])->whereNumber('article');
    Route::get('articles/{article:id}/revisions/{revision}', [ArticleRevisionController::class, 'show'])
        ->whereNumber(['article', 'revision']);
    Route::delete('articles/{article:id}/revisions/{revision}', [ArticleRevisionController::class, 'destroy'])
        ->whereNumber(['article', 'revision']);

    Route::get('media', [MediaController::class, 'index']);
    Route::post('media', [MediaController::class, 'store']);
    Route::match(['put', 'patch'], 'media/{medium}', [MediaController::class, 'update']);
    Route::delete('media/{medium}', [MediaController::class, 'destroy']);
    Route::get('media/trash', [MediaController::class, 'trashIndex']);
    Route::get('media/trash/count', [MediaController::class, 'trashCount']);
    Route::post('media/{id}/restore', [MediaController::class, 'restore'])->whereNumber('id');

    Route::post('media/optimize-preview', [MediaOptimizeController::class, 'preview']);
    Route::post('media/optimize-confirm', [MediaOptimizeController::class, 'confirm']);
    Route::post('media/{medium}/optimize-preview', [MediaOptimizeController::class, 'previewExisting']);
    Route::post('media/{medium}/optimize-replace', [MediaOptimizeController::class, 'confirmReplace']);
    Route::delete('media/optimize-preview/{session}', [MediaOptimizeController::class, 'discard']);

    Route::get('settings/{group}', [SettingController::class, 'show']);
    Route::put('settings/{group}', [SettingController::class, 'update']);

    Route::get('panel/cache/status', [CacheController::class, 'status']);
    Route::get('panel/cache/settings', [CacheController::class, 'settings']);
    Route::put('panel/cache/settings', [CacheController::class, 'updateSettings']);
    Route::post('panel/cache/purge', [CacheController::class, 'purge']);
    Route::delete('panel/cache/purge-log', [CacheController::class, 'clearPurgeLog']);
    Route::post('panel/cache/developer-mode', [CacheController::class, 'developerMode']);
    Route::get('panel/cache/integrations', [CacheController::class, 'integrations']);
    Route::put('panel/cache/integrations', [CacheController::class, 'updateIntegrations']);
    Route::post('panel/cache/integrations/test', [CacheController::class, 'testIntegrations']);

    Route::get('leads', [\App\Http\Controllers\Api\V1\LeadController::class, 'index']);
    Route::get('leads/{lead}', [\App\Http\Controllers\Api\V1\LeadController::class, 'show'])->whereNumber('lead');
    Route::patch('leads/{lead}', [\App\Http\Controllers\Api\V1\LeadController::class, 'update'])->whereNumber('lead');

    Route::get('analytics/summary', [DashboardController::class, 'summary']);

    Route::get('products', [ProductController::class, 'index']);
    Route::post('products', [ProductController::class, 'store']);
    Route::get('products/{product:id}', [ProductController::class, 'show'])->whereNumber('product');
    Route::match(['put', 'patch'], 'products/{product:id}', [ProductController::class, 'update'])->whereNumber('product');
    Route::delete('products/{product:id}', [ProductController::class, 'destroy'])->whereNumber('product');

    Route::get('orders', [OrderController::class, 'index']);
    Route::get('orders/{order}', [OrderController::class, 'show'])->whereNumber('order');
    Route::patch('orders/{order}', [OrderController::class, 'update'])->whereNumber('order');
    Route::post('orders/{order}/resend-sms', [OrderController::class, 'resendSms'])->whereNumber('order');

    Route::get('faqs', [FaqController::class, 'index']);
    Route::post('faqs', [FaqController::class, 'store']);
    Route::get('faqs/{faq}', [FaqController::class, 'show'])->whereNumber('faq');
    Route::match(['put', 'patch'], 'faqs/{faq}', [FaqController::class, 'update'])->whereNumber('faq');
    Route::delete('faqs/{faq}', [FaqController::class, 'destroy'])->whereNumber('faq');

    Route::get('student-testimonials', [StudentTestimonialController::class, 'index']);
    Route::post('student-testimonials', [StudentTestimonialController::class, 'store']);
    Route::get('student-testimonials/{studentTestimonial}', [StudentTestimonialController::class, 'show'])->whereNumber('studentTestimonial');
    Route::match(['put', 'patch'], 'student-testimonials/{studentTestimonial}', [StudentTestimonialController::class, 'update'])->whereNumber('studentTestimonial');
    Route::delete('student-testimonials/{studentTestimonial}', [StudentTestimonialController::class, 'destroy'])->whereNumber('studentTestimonial');

    Route::get('panel/payment-settings', [CommercePaymentSettingsController::class, 'show']);
    Route::put('panel/payment-settings', [CommercePaymentSettingsController::class, 'update']);

    Route::get('panel/sms-spotplayer-settings', [CommerceSmsSpotplayerController::class, 'show']);
    Route::put('panel/sms-spotplayer-settings', [CommerceSmsSpotplayerController::class, 'update']);
    Route::post('panel/sms-spotplayer-settings/test-sms', [CommerceSmsSpotplayerController::class, 'testSms']);
    Route::post('panel/sms-spotplayer-settings/test-spotplayer', [CommerceSmsSpotplayerController::class, 'testSpotplayer']);

    Route::get('panel/settings/image-optimizer', [ImageOptimizerSettingsController::class, 'show']);
    Route::put('panel/settings/image-optimizer', [ImageOptimizerSettingsController::class, 'update']);
    Route::post('panel/settings/image-optimizer/test', [ImageOptimizerSettingsController::class, 'test']);

    Route::get('panel/leads/export', LeadExportController::class);
    Route::get('panel/orders/export', OrderExportController::class);

    Route::get('panel/chatbot/logs', [ChatbotController::class, 'adminLogs']);
    Route::get('panel/chatbot/sessions', [ChatbotController::class, 'adminSessions']);
    Route::get('panel/chatbot/operator-queue', [ChatbotController::class, 'adminOperatorQueue']);
    Route::get('panel/chatbot/sessions/{sessionId}/thread', [ChatbotController::class, 'adminSessionThread']);
    Route::post('panel/chatbot/sessions/{sessionId}/reply', [ChatbotController::class, 'adminOperatorReply']);
    Route::get('panel/chatbot/export', [ChatbotController::class, 'adminExport']);
    Route::delete('panel/chatbot/sessions', [ChatbotController::class, 'adminDeleteSessions']);
});

Route::get('cache/public', [CacheController::class, 'publicConfig']);

Route::get('captcha/config', [CaptchaController::class, 'config'])->middleware('throttle:60,1');
Route::get('captcha/math', [CaptchaController::class, 'math'])->middleware('throttle:120,1');
Route::post('captcha/math/store', [CaptchaController::class, 'storeMath']);

Route::get('chatbot/config', [ChatbotController::class, 'config'])->middleware('throttle:120,1');
Route::post('chatbot/gate', [ChatbotController::class, 'gate']);
Route::post('chatbot/ai-runtime', [ChatbotController::class, 'aiRuntime']);
Route::post('chatbot/verify-captcha', [ChatbotController::class, 'verifyCaptchaOnly']);
Route::post('chatbot/complete', [ChatbotController::class, 'complete']);
Route::post('chatbot/rate', [ChatbotController::class, 'rate']);
Route::post('chatbot/rating-feedback', [ChatbotController::class, 'ratingFeedback']);
Route::post('chatbot/session-open', [ChatbotController::class, 'sessionOpen']);
Route::post('chatbot/phone', [ChatbotController::class, 'savePhone']);
Route::post('chatbot/visitor-info', [ChatbotController::class, 'saveVisitorInfo']);
Route::post('chatbot/visitor-message', [ChatbotController::class, 'visitorMessage']);
Route::post('chatbot/poll', [ChatbotController::class, 'poll']);
