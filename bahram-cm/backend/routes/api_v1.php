<?php

use App\Http\Controllers\Admin\LeadExportController;
use App\Http\Controllers\Admin\OrderExportController;
use App\Http\Controllers\Api\V1\Admin\CashbackPayoutAdminController;
use App\Http\Controllers\Api\V1\Admin\CourseAccessController as AdminCourseAccessController;
use App\Http\Controllers\Api\V1\Admin\SpotplayerLicenseAdminController;
use App\Http\Controllers\Api\V1\Admin\ImportAdminController;
use App\Http\Controllers\Api\V1\Admin\NotificationAdminController;
use App\Http\Controllers\Api\V1\Admin\ReferralAdminController;
use App\Http\Controllers\Api\V1\Admin\SatApplicationAdminController;
use App\Http\Controllers\Api\V1\Admin\SeminarAdminController;
use App\Http\Controllers\Api\V1\Admin\SmsAdminController;
use App\Http\Controllers\Api\V1\Admin\SmsCenterConfigController;
use App\Http\Controllers\Api\V1\Admin\StudentController as AdminStudentController;
use App\Http\Controllers\Api\V1\Admin\TicketAdminController;
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
use App\Http\Controllers\Api\V1\SmsSpotplayerCredentialsController;
use App\Http\Controllers\Api\V1\MediaConfigController;
use App\Http\Controllers\Api\V1\MediaController;
use App\Http\Controllers\Api\V1\MediaOptimizeController;
use App\Http\Controllers\Api\V1\SettingController;
use App\Http\Controllers\Api\V1\Student\AuthController as StudentAuthController;
use App\Http\Controllers\Api\V1\Student\CashbackPayoutController as StudentCashbackPayoutController;
use App\Http\Controllers\Api\V1\Student\CertificateDownloadController;
use App\Http\Controllers\Api\V1\Student\CourseController as StudentCourseController;
use App\Http\Controllers\Api\V1\Student\DashboardController as StudentDashboardController;
use App\Http\Controllers\Api\V1\Student\NotificationController as StudentNotificationController;
use App\Http\Controllers\Api\V1\Student\OrderController as StudentOrderController;
use App\Http\Controllers\Api\V1\Student\ProfileController as StudentProfileController;
use App\Http\Controllers\Api\V1\Student\ReferralController as StudentReferralController;
use App\Http\Controllers\Api\V1\Student\SatApplicationController as StudentSatApplicationController;
use App\Http\Controllers\Api\V1\Student\SeminarAssetDownloadController;
use App\Http\Controllers\Api\V1\Student\SeminarController as StudentSeminarController;
use App\Http\Controllers\Api\V1\Student\SpotPlayerSessionController as StudentSpotPlayerSessionController;
use App\Http\Controllers\Api\V1\Student\TicketController as StudentTicketController;
use App\Http\Controllers\Api\V1\StudentTestimonialController;
use Illuminate\Support\Facades\Route;

Route::post('auth/login', [AuthController::class, 'login']);

/*
|--------------------------------------------------------------------------
| Student Academy Portal API (mobile + OTP identity, separate from admin)
|--------------------------------------------------------------------------
*/
Route::prefix('student')->group(function () {
    Route::post('auth/send-otp', [StudentAuthController::class, 'sendOtp']);
    Route::post('auth/send-otp-bale', [StudentAuthController::class, 'sendOtpViaBale']);
    Route::post('auth/verify-otp', [StudentAuthController::class, 'verifyOtp']);
    Route::post('auth/login-password', [StudentAuthController::class, 'loginPassword']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', [StudentAuthController::class, 'logout']);
        Route::get('me', [StudentAuthController::class, 'me']);

        Route::get('dashboard', [StudentDashboardController::class, 'index']);
        Route::post('dashboard/steps/{step}', [StudentDashboardController::class, 'markStep']);

        Route::get('profile', [StudentProfileController::class, 'show']);
        Route::put('profile', [StudentProfileController::class, 'update']);

        Route::get('courses', [StudentCourseController::class, 'index']);
        Route::get('courses/{courseAccess}/player', [StudentCourseController::class, 'player'])->whereNumber('courseAccess');
        Route::get('spotplayer-session', [StudentSpotPlayerSessionController::class, 'show']);
        Route::put('spotplayer-session', [StudentSpotPlayerSessionController::class, 'update']);
        Route::get('orders', [StudentOrderController::class, 'index']);

        Route::get('seminars', [StudentSeminarController::class, 'index']);
        Route::get('seminars/{seminar}', [StudentSeminarController::class, 'show']);

        Route::get('referrals', [StudentReferralController::class, 'show']);

        Route::get('cashback-payouts', [StudentCashbackPayoutController::class, 'index']);
        Route::post('cashback-payouts', [StudentCashbackPayoutController::class, 'store']);

        Route::get('sat-application', [StudentSatApplicationController::class, 'show']);
        Route::post('sat-application', [StudentSatApplicationController::class, 'store']);

        Route::get('tickets', [StudentTicketController::class, 'index']);
        Route::get('tickets/{ticket}', [StudentTicketController::class, 'show']);
        Route::post('tickets', [StudentTicketController::class, 'store']);
        Route::post('tickets/{ticket}/messages', [StudentTicketController::class, 'storeMessage']);

        Route::get('notifications/unread-count', [StudentNotificationController::class, 'unreadCount']);
        Route::get('notifications', [StudentNotificationController::class, 'index']);
        Route::post('notifications/read-all', [StudentNotificationController::class, 'markAllRead']);
        Route::post('notifications/{notification}/read', [StudentNotificationController::class, 'markRead']);
    });
});

// Secure, short-lived signed links for seminar assets/certificates — never public direct links.
Route::get('student/seminar-assets/{asset}/download', SeminarAssetDownloadController::class)
    ->name('student.seminar-assets.download')
    ->middleware('signed');
Route::get('student/certificates/{certificate}/download', CertificateDownloadController::class)
    ->name('student.certificates.download')
    ->middleware('signed');

Route::get('media/config', [MediaConfigController::class, 'config']);
Route::get('media/optimize-preview/{session}/{variant}', [MediaOptimizeController::class, 'previewFile'])
    ->name('media.optimize.preview');

Route::middleware(['auth:sanctum', 'admin'])->group(function () {
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
    Route::get('orders/analytics', [OrderController::class, 'analytics']);
    Route::get('orders/{order}', [OrderController::class, 'show'])->whereNumber('order');
    Route::patch('orders/{order}', [OrderController::class, 'update'])->whereNumber('order');
    Route::post('orders/{order}/resend-sms', [OrderController::class, 'resendSms'])->whereNumber('order');
    Route::post('orders/{order}/fulfill', [OrderController::class, 'fulfill'])->whereNumber('order');

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

    Route::get('panel/settings/sms-spotplayer-credentials', [SmsSpotplayerCredentialsController::class, 'show']);
    Route::put('panel/settings/sms-spotplayer-credentials', [SmsSpotplayerCredentialsController::class, 'update']);
    Route::post('panel/settings/sms-spotplayer-credentials/test', [SmsSpotplayerCredentialsController::class, 'test']);

    Route::get('panel/leads/export', LeadExportController::class);
    Route::get('panel/orders/export', OrderExportController::class);

    Route::get('panel/chatbot/logs', [ChatbotController::class, 'adminLogs']);
    Route::get('panel/chatbot/sessions', [ChatbotController::class, 'adminSessions']);
    Route::get('panel/chatbot/operator-queue', [ChatbotController::class, 'adminOperatorQueue']);
    Route::get('panel/chatbot/sessions/{sessionId}/thread', [ChatbotController::class, 'adminSessionThread']);
    Route::post('panel/chatbot/sessions/{sessionId}/reply', [ChatbotController::class, 'adminOperatorReply']);
    Route::get('panel/chatbot/export', [ChatbotController::class, 'adminExport']);
    Route::delete('panel/chatbot/sessions', [ChatbotController::class, 'adminDeleteSessions']);

    /*
    |--------------------------------------------------------------------------
    | Student Academy Portal — Admin extensions (Phase 5)
    |--------------------------------------------------------------------------
    */
    Route::get('students', [AdminStudentController::class, 'index']);
    Route::post('students', [AdminStudentController::class, 'store']);
    Route::get('students/{student}', [AdminStudentController::class, 'show'])->whereNumber('student');
    Route::patch('students/{student}', [AdminStudentController::class, 'update'])->whereNumber('student');

    Route::get('course-accesses', [AdminCourseAccessController::class, 'index']);
    Route::post('course-accesses', [AdminCourseAccessController::class, 'store']);
    Route::patch('course-accesses/{courseAccess}', [AdminCourseAccessController::class, 'update'])->whereNumber('courseAccess');

    Route::get('spotplayer-licenses', [SpotplayerLicenseAdminController::class, 'index']);

    Route::get('seminars', [SeminarAdminController::class, 'index']);
    Route::post('seminars', [SeminarAdminController::class, 'store']);
    Route::get('seminars/{seminar:id}', [SeminarAdminController::class, 'show'])->whereNumber('seminar');
    Route::patch('seminars/{seminar:id}', [SeminarAdminController::class, 'update'])->whereNumber('seminar');
    Route::post('seminars/{seminar:id}/attendees', [SeminarAdminController::class, 'addAttendee'])->whereNumber('seminar');
    Route::patch('seminars/{seminar:id}/attendees/{attendee}', [SeminarAdminController::class, 'updateAttendee'])->whereNumber(['seminar', 'attendee']);
    Route::post('seminars/{seminar:id}/assets', [SeminarAdminController::class, 'uploadAsset'])->whereNumber('seminar');
    Route::delete('seminars/{seminar:id}/assets/{asset}', [SeminarAdminController::class, 'deleteAsset'])->whereNumber(['seminar', 'asset']);
    Route::post('seminars/{seminar:id}/certificates', [SeminarAdminController::class, 'issueCertificate'])->whereNumber('seminar');

    Route::get('referrals', [ReferralAdminController::class, 'index']);
    Route::get('referral-codes', [ReferralAdminController::class, 'codes']);
    Route::patch('referrals/{referral}', [ReferralAdminController::class, 'update'])->whereNumber('referral');

    Route::get('cashback-payouts', [CashbackPayoutAdminController::class, 'index']);
    Route::get('cashback-payouts/{payout}', [CashbackPayoutAdminController::class, 'show'])->whereNumber('payout');
    Route::patch('cashback-payouts/{payout}', [CashbackPayoutAdminController::class, 'update'])->whereNumber('payout');

    Route::get('sat-applications', [SatApplicationAdminController::class, 'index']);
    Route::patch('sat-applications/{satApplication}', [SatApplicationAdminController::class, 'update'])->whereNumber('satApplication');

    Route::get('tickets', [TicketAdminController::class, 'index']);
    Route::post('tickets', [TicketAdminController::class, 'store']);
    Route::get('tickets/users', [TicketAdminController::class, 'users']);
    Route::get('tickets/reports', [TicketAdminController::class, 'reports']);
    Route::get('tickets/{ticket}', [TicketAdminController::class, 'show'])->whereNumber('ticket');
    Route::patch('tickets/{ticket}', [TicketAdminController::class, 'update'])->whereNumber('ticket');
    Route::post('tickets/{ticket}/messages', [TicketAdminController::class, 'storeMessage'])->whereNumber('ticket');

    Route::get('notifications', [NotificationAdminController::class, 'index']);
    Route::post('notifications', [NotificationAdminController::class, 'store']);

    Route::get('sms/segments', [SmsAdminController::class, 'segments']);
    Route::post('sms/send', [SmsAdminController::class, 'send']);
    Route::get('sms/logs', [SmsAdminController::class, 'logs']);
    Route::post('sms/test', [SmsAdminController::class, 'test']);

    Route::get('sms/center-config', [SmsCenterConfigController::class, 'show']);
    Route::put('sms/center-config/global', [SmsCenterConfigController::class, 'updateGlobal']);
    Route::put('sms/center-config/providers/{slug}', [SmsCenterConfigController::class, 'updateProvider']);
    Route::post('sms/center-config/providers/{slug}/test', [SmsCenterConfigController::class, 'testProvider']);
    Route::put('sms/center-config/events/{eventKey}', [SmsCenterConfigController::class, 'updateEvent']);

    Route::post('imports/students/preview', [ImportAdminController::class, 'preview']);
    Route::post('imports/students/commit', [ImportAdminController::class, 'commit']);
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
