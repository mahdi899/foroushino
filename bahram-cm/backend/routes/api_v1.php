<?php

use App\Http\Controllers\Admin\LeadExportController;
use App\Http\Controllers\Admin\OrderExportController;
use App\Http\Controllers\Admin\StudentExportController;
use App\Http\Controllers\Api\V1\Admin\AuditLogAdminController;
use App\Http\Controllers\Api\V1\Admin\CashbackPayoutAdminController;
use App\Http\Controllers\Api\V1\Admin\CourseAccessController as AdminCourseAccessController;
use App\Http\Controllers\Api\V1\Admin\IdentityArtifactController;
use App\Http\Controllers\Api\V1\Admin\IdentityProviderAdminController;
use App\Http\Controllers\Api\V1\Admin\IdentityVerificationAdminController;
use App\Http\Controllers\Api\V1\Admin\SpotplayerLicenseAdminController;
use App\Http\Controllers\Api\V1\Admin\ImportAdminController;
use App\Http\Controllers\Api\V1\Admin\NotificationAdminController;
use App\Http\Controllers\Api\V1\Admin\ReferralAdminController;
use App\Http\Controllers\Api\V1\Admin\RoleAdminController;
use App\Http\Controllers\Api\V1\Admin\SatApplicationAdminController;
use App\Http\Controllers\Api\V1\Admin\SatIntegrationAdminController;
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
use App\Http\Controllers\Api\V1\DiscountCodeAdminController;
use App\Http\Controllers\Api\V1\FaqController;
use App\Http\Controllers\Api\V1\Family\ActionController as FamilyActionController;
use App\Http\Controllers\Api\V1\Family\BrandingController as FamilyBrandingController;
use App\Http\Controllers\Api\V1\Family\CommentController as FamilyCommentController;
use App\Http\Controllers\Api\V1\Family\FeedController as FamilyFeedController;
use App\Http\Controllers\Api\V1\Family\MediaProgressController as FamilyMediaProgressController;
use App\Http\Controllers\Api\V1\Family\PostViewController as FamilyPostViewController;
use App\Http\Controllers\Api\V1\Family\PulseController as FamilyPulseController;
use App\Http\Controllers\Api\V1\Family\ReactionController as FamilyReactionController;
use App\Http\Controllers\Api\V1\Family\StoryController as FamilyStoryController;
use App\Http\Controllers\Api\V1\FamilyManager\AnalyticsController as FamilyManagerAnalyticsController;
use App\Http\Controllers\Api\V1\FamilyManager\CommentModerationController as FamilyManagerCommentModerationController;
use App\Http\Controllers\Api\V1\FamilyManager\EntryLinksController as FamilyManagerEntryLinksController;
use App\Http\Controllers\Api\V1\FamilyManager\FamiliesController as FamilyManagerFamiliesController;
use App\Http\Controllers\Api\V1\FamilyManager\HomeController as FamilyManagerHomeController;
use App\Http\Controllers\Api\V1\FamilyManager\MediaController as FamilyManagerMediaController;
use App\Http\Controllers\Api\V1\FamilyManager\PostController as FamilyManagerPostController;
use App\Http\Controllers\Api\V1\FamilyManager\SettingsController as FamilyManagerSettingsController;
use App\Http\Controllers\Api\V1\FamilyManager\StoryController as FamilyManagerStoryController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\DatabaseBackupSettingsController;
use App\Http\Controllers\Api\V1\ImageOptimizerSettingsController;
use App\Http\Controllers\Api\V1\SmsSpotplayerCredentialsController;
use App\Http\Controllers\Api\V1\MediaConfigController;
use App\Http\Controllers\Api\V1\MediaController;
use App\Http\Controllers\Api\V1\MediaFtpController;
use App\Http\Controllers\Api\V1\MediaOptimizeController;
use App\Http\Controllers\Api\V1\ContentCommentAdminController;
use App\Http\Controllers\Api\V1\MiniCourseCommentController;
use App\Http\Controllers\Api\V1\MiniCourseController;
use App\Http\Controllers\Api\V1\SettingController;
use App\Http\Controllers\Api\V1\Student\AuthController as StudentAuthController;
use App\Http\Controllers\Api\V1\Student\SsoBridgeController;
use App\Http\Controllers\Api\V1\Student\CashbackPayoutController as StudentCashbackPayoutController;
use App\Http\Controllers\Api\V1\Student\CertificateDownloadController;
use App\Http\Controllers\Api\V1\Student\CourseController as StudentCourseController;
use App\Http\Controllers\Api\V1\Student\DashboardController as StudentDashboardController;
use App\Http\Controllers\Api\V1\Student\IdentityVerificationController as StudentIdentityVerificationController;
use App\Http\Controllers\Api\V1\Student\MiniCourseController as StudentMiniCourseController;
use App\Http\Controllers\Api\V1\Student\MobileOwnershipController as StudentMobileOwnershipController;
use App\Http\Controllers\Api\V1\Student\NotificationController as StudentNotificationController;
use App\Http\Controllers\Api\V1\Student\OrderController as StudentOrderController;
use App\Http\Controllers\Api\V1\Student\ProfileController as StudentProfileController;
use App\Http\Controllers\Api\V1\Student\ReferralController as StudentReferralController;
use App\Http\Controllers\Api\V1\Student\SatApplicationController as StudentSatApplicationController;
use App\Http\Controllers\Api\V1\Student\SeminarAssetDownloadController;
use App\Http\Controllers\Api\V1\Student\SeminarController as StudentSeminarController;
use App\Http\Controllers\Api\V1\Student\SpotPlayerSessionController as StudentSpotPlayerSessionController;
use App\Http\Controllers\Api\V1\Student\TicketController as StudentTicketController;
use App\Http\Controllers\Api\V1\Student\VerifiedBankAccountController as StudentVerifiedBankAccountController;
use App\Http\Controllers\Api\V1\StudentTestimonialController;
use App\Http\Controllers\Api\V1\Sat\ActivityController as SatActivityController;
use App\Http\Controllers\Api\V1\Sat\AuthController as SatAuthController;
use App\Http\Controllers\Api\V1\Sat\CallController as SatCallController;
use App\Http\Controllers\Api\V1\Sat\InboundApplicationController;
use App\Http\Controllers\Api\V1\Sat\IntegrationTokenController;
use App\Http\Controllers\Api\V1\Sat\LeadController as SatLeadController;
use App\Http\Controllers\Api\V1\Sat\StaffController as SatStaffController;
use App\Http\Controllers\Api\V1\Sat\StatusCallbackController as SatStatusCallbackController;
use Illuminate\Support\Facades\Route;

Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:admin-login');
Route::post('auth/send-otp', [AuthController::class, 'sendOtp'])->middleware('throttle:10,1');
Route::post('auth/resend-otp', [AuthController::class, 'resendOtp'])->middleware('throttle:10,1');
Route::post('auth/verify-otp', [AuthController::class, 'verifyOtp'])->middleware('throttle:20,1');

/*
|--------------------------------------------------------------------------
| SAT Call Center Portal (invite-only staff, no public registration)
|--------------------------------------------------------------------------
*/
Route::prefix('sat')->group(function () {
    Route::post('auth/login', [SatAuthController::class, 'login'])->middleware('throttle:admin-login');
    Route::post('auth/resend-otp', [SatAuthController::class, 'resendOtp'])->middleware('throttle:10,1');
    Route::post('auth/verify-otp', [SatAuthController::class, 'verifyOtp'])->middleware('throttle:20,1');

    Route::middleware(['auth:sanctum', 'sat.staff'])->group(function () {
        Route::post('auth/logout', [SatAuthController::class, 'logout']);
        Route::get('me', [SatAuthController::class, 'me']);

        Route::get('staff', [SatStaffController::class, 'index']);
        Route::post('staff', [SatStaffController::class, 'store']);
        Route::patch('staff/{staff}', [SatStaffController::class, 'update'])->whereNumber('staff');

        Route::get('leads', [SatLeadController::class, 'index']);
        Route::post('leads', [SatLeadController::class, 'store']);
        Route::get('leads/{lead}', [SatLeadController::class, 'show'])->whereNumber('lead');
        Route::patch('leads/{lead}', [SatLeadController::class, 'update'])->whereNumber('lead');

        Route::get('calls', [SatCallController::class, 'index']);
        Route::post('calls', [SatCallController::class, 'store']);
        Route::patch('calls/{call}/review', [SatCallController::class, 'review'])->whereNumber('call');

        Route::get('activities', [SatActivityController::class, 'index']);
        Route::post('activities', [SatActivityController::class, 'store']);
        Route::post('activities/{activity}/approve', [SatActivityController::class, 'approve'])->whereNumber('activity');
        Route::post('activities/{activity}/reject', [SatActivityController::class, 'reject'])->whereNumber('activity');

        Route::get('integration-tokens', [IntegrationTokenController::class, 'index']);
        Route::post('integration-tokens', [IntegrationTokenController::class, 'store']);
        Route::delete('integration-tokens/{integrationToken}', [IntegrationTokenController::class, 'destroy'])->whereNumber('integrationToken');
    });
});

/*
|--------------------------------------------------------------------------
| SAT inbound integration (Bahram site → SAT, token auth, cross-domain)
|--------------------------------------------------------------------------
*/
Route::prefix('integrations/inbound')
    ->middleware(['proxy.origin:presence', 'throttle:integration'])
    ->group(function () {
        Route::middleware('sat.integration:inbound:applications')->group(function () {
            Route::get('ping', [InboundApplicationController::class, 'ping']);
            Route::post('applications', [InboundApplicationController::class, 'store']);
        });

        // Reverse channel: Saat reports a lead status change for an
        // application that Bahram originally pushed out (HMAC-signed body).
        Route::post('sat-status', [SatStatusCallbackController::class, 'store'])
            ->middleware('sat.integration:callback:lead-status');
    });

/*
|--------------------------------------------------------------------------
| Student Academy Portal API (mobile + OTP identity, separate from admin)
|--------------------------------------------------------------------------
*/
Route::prefix('student')->group(function () {
    Route::post('auth/send-otp', [StudentAuthController::class, 'sendOtp'])->middleware('throttle:student-auth');
    Route::post('auth/send-otp-bale', [StudentAuthController::class, 'sendOtpViaBale'])->middleware('throttle:student-auth');
    Route::post('auth/verify-otp', [StudentAuthController::class, 'verifyOtp'])->middleware('throttle:student-auth');
    Route::post('auth/login-password', [StudentAuthController::class, 'loginPassword'])->middleware('throttle:student-auth');

    // Cross-domain SSO handoff between rostami.app and rostami.club (see SsoBridgeController).
    Route::post('auth/sso/consume', [SsoBridgeController::class, 'consume'])->middleware('throttle:student-auth');

    Route::middleware(['auth:sanctum', 'student.active'])->group(function () {
        Route::post('auth/sso/bridge', [SsoBridgeController::class, 'issue']);
        Route::post('auth/logout', [StudentAuthController::class, 'logout']);
        Route::get('me', [StudentAuthController::class, 'me']);

        Route::get('dashboard', [StudentDashboardController::class, 'index']);
        Route::post('dashboard/steps/{step}', [StudentDashboardController::class, 'markStep']);

        Route::get('profile', [StudentProfileController::class, 'show']);
        Route::put('profile', [StudentProfileController::class, 'update']);
        Route::post('profile/password/send-otp', [StudentProfileController::class, 'sendPasswordChangeOtp']);
        Route::put('profile/password', [StudentProfileController::class, 'updatePassword']);
        Route::post('profile/avatar', [StudentProfileController::class, 'updateAvatar']);

        Route::get('courses', [StudentCourseController::class, 'index']);
        Route::get('courses/{courseAccess}/player', [StudentCourseController::class, 'player'])->whereNumber('courseAccess');
        Route::post('mini-courses/{slug}/enroll', [StudentMiniCourseController::class, 'enroll']);
        Route::get('mini-courses/{slug}', [StudentMiniCourseController::class, 'show']);
        Route::get('mini-courses/{slug}/player', [StudentMiniCourseController::class, 'player']);
        Route::get('spotplayer-session', [StudentSpotPlayerSessionController::class, 'show']);
        Route::put('spotplayer-session', [StudentSpotPlayerSessionController::class, 'update']);
        Route::get('orders', [StudentOrderController::class, 'index']);

        Route::get('seminars', [StudentSeminarController::class, 'index']);
        Route::get('seminars/{seminar}', [StudentSeminarController::class, 'show']);

        Route::get('referrals', [StudentReferralController::class, 'show']);

        Route::get('cashback-payouts', [StudentCashbackPayoutController::class, 'index']);
        Route::post('cashback-payouts', [StudentCashbackPayoutController::class, 'store']);

        Route::get('verified-bank-accounts', [StudentVerifiedBankAccountController::class, 'index']);
        Route::get('verified-bank-accounts/rules', [StudentVerifiedBankAccountController::class, 'rules']);
        Route::post('verified-bank-accounts', [StudentVerifiedBankAccountController::class, 'store'])
            ->middleware('throttle:bank-account-verify');
        Route::delete('verified-bank-accounts/{bankAccount}', [StudentVerifiedBankAccountController::class, 'destroy'])
            ->whereNumber('bankAccount');

        Route::get('identity-verification', [StudentIdentityVerificationController::class, 'show']);
        Route::post('identity-verification/draft', [StudentIdentityVerificationController::class, 'draft']);
        Route::post('identity-verification/artifacts', [StudentIdentityVerificationController::class, 'uploadArtifact']);
        Route::get('identity-verification/artifacts/{artifact}/stream', [StudentIdentityVerificationController::class, 'streamArtifact'])
            ->whereNumber('artifact');
        Route::get('identity-verification/video-prompt', [StudentIdentityVerificationController::class, 'videoPrompt']);
        Route::post('identity-verification/submit', [StudentIdentityVerificationController::class, 'submit'])
            ->middleware('throttle:identity-submit');

        Route::get('mobile-ownership', [StudentMobileOwnershipController::class, 'show']);
        Route::post('mobile-ownership/verify', [StudentMobileOwnershipController::class, 'verify'])
            ->middleware('throttle:ownership-verify');

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

// Signed download for private media (e.g. patient photos) — the controller
// itself accepts either a valid signature (guest-safe temporary link) or an
// authenticated admin with `media.read`, so this must stay outside the
// auth:sanctum-gated admin group below.
Route::get('media/{medium}/download', [MediaController::class, 'download'])
    ->name('media.download');

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

    // Download-host (FTP/SFTP) connection management + two-way transfer.
    Route::get('media/ftp/connection', [MediaFtpController::class, 'connection']);
    Route::put('media/ftp/connection', [MediaFtpController::class, 'updateConnection']);
    Route::post('media/ftp/connection/test', [MediaFtpController::class, 'testConnection']);
    Route::get('media/ftp/list', [MediaFtpController::class, 'list']);
    Route::post('media/ftp/sync', [MediaFtpController::class, 'sync']);
    Route::delete('media/ftp/file', [MediaFtpController::class, 'destroyRemote']);
    Route::post('media/{medium}/ftp/push', [MediaFtpController::class, 'push']);
    Route::post('media/{medium}/ftp/pull', [MediaFtpController::class, 'pull']);

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
    Route::post('faqs/reorder', [FaqController::class, 'reorder']);
    Route::get('faqs/{faq}', [FaqController::class, 'show'])->whereNumber('faq');
    Route::match(['put', 'patch'], 'faqs/{faq}', [FaqController::class, 'update'])->whereNumber('faq');
    Route::delete('faqs/{faq}', [FaqController::class, 'destroy'])->whereNumber('faq');

    Route::get('discount-codes', [DiscountCodeAdminController::class, 'index']);
    Route::post('discount-codes', [DiscountCodeAdminController::class, 'store']);
    Route::get('discount-codes/{discountCode}', [DiscountCodeAdminController::class, 'show'])->whereNumber('discountCode');
    Route::match(['put', 'patch'], 'discount-codes/{discountCode}', [DiscountCodeAdminController::class, 'update'])->whereNumber('discountCode');
    Route::delete('discount-codes/{discountCode}', [DiscountCodeAdminController::class, 'destroy'])->whereNumber('discountCode');

    Route::get('student-testimonials', [StudentTestimonialController::class, 'index']);
    Route::post('student-testimonials', [StudentTestimonialController::class, 'store']);
    Route::get('student-testimonials/{studentTestimonial}', [StudentTestimonialController::class, 'show'])->whereNumber('studentTestimonial');
    Route::match(['put', 'patch'], 'student-testimonials/{studentTestimonial}', [StudentTestimonialController::class, 'update'])->whereNumber('studentTestimonial');
    Route::delete('student-testimonials/{studentTestimonial}', [StudentTestimonialController::class, 'destroy'])->whereNumber('studentTestimonial');

    Route::get('mini-courses', [MiniCourseController::class, 'index']);
    Route::post('mini-courses', [MiniCourseController::class, 'store']);
    Route::get('mini-courses/{miniCourse:id}', [MiniCourseController::class, 'show'])->whereNumber('miniCourse');
    Route::match(['put', 'patch'], 'mini-courses/{miniCourse:id}', [MiniCourseController::class, 'update'])->whereNumber('miniCourse');
    Route::delete('mini-courses/{miniCourse:id}', [MiniCourseController::class, 'destroy'])->whereNumber('miniCourse');
    Route::get('mini-courses/{miniCourse:id}/comments', [MiniCourseCommentController::class, 'index'])->whereNumber('miniCourse');
    Route::match(['put', 'patch'], 'mini-courses/{miniCourse:id}/comments/{contentComment}', [MiniCourseCommentController::class, 'update'])
        ->whereNumber(['miniCourse', 'contentComment']);
    Route::delete('mini-courses/{miniCourse:id}/comments/{contentComment}', [MiniCourseCommentController::class, 'destroy'])
        ->whereNumber(['miniCourse', 'contentComment']);

    Route::get('content-comments', [ContentCommentAdminController::class, 'index']);
    Route::match(['put', 'patch'], 'content-comments/{contentComment}', [ContentCommentAdminController::class, 'update'])
        ->whereNumber('contentComment');
    Route::delete('content-comments/{contentComment}', [ContentCommentAdminController::class, 'destroy'])
        ->whereNumber('contentComment');

    Route::get('panel/payment-settings', [CommercePaymentSettingsController::class, 'show']);
    Route::put('panel/payment-settings', [CommercePaymentSettingsController::class, 'update']);

    Route::get('panel/sms-spotplayer-settings', [CommerceSmsSpotplayerController::class, 'show']);
    Route::put('panel/sms-spotplayer-settings', [CommerceSmsSpotplayerController::class, 'update']);
    Route::post('panel/sms-spotplayer-settings/test-sms', [CommerceSmsSpotplayerController::class, 'testSms']);
    Route::post('panel/sms-spotplayer-settings/test-spotplayer', [CommerceSmsSpotplayerController::class, 'testSpotplayer']);

    Route::get('panel/settings/image-optimizer', [ImageOptimizerSettingsController::class, 'show']);
    Route::put('panel/settings/image-optimizer', [ImageOptimizerSettingsController::class, 'update']);
    Route::post('panel/settings/image-optimizer/test', [ImageOptimizerSettingsController::class, 'test']);

    Route::get('panel/settings/database-backup', [DatabaseBackupSettingsController::class, 'show']);
    Route::put('panel/settings/database-backup', [DatabaseBackupSettingsController::class, 'update']);
    Route::post('panel/settings/database-backup/run', [DatabaseBackupSettingsController::class, 'run']);
    Route::get('panel/settings/database-backup/export', [DatabaseBackupSettingsController::class, 'export']);
    Route::get('panel/settings/database-backup/export/media', [DatabaseBackupSettingsController::class, 'exportMedia']);
    Route::post('panel/settings/database-backup/import', [DatabaseBackupSettingsController::class, 'import']);
    Route::post('panel/settings/database-backup/upload-download-host', [DatabaseBackupSettingsController::class, 'uploadDownloadHost']);
    Route::post('panel/settings/database-backup/test-telegram', [DatabaseBackupSettingsController::class, 'testTelegram']);

    Route::get('panel/settings/sms-spotplayer-credentials', [SmsSpotplayerCredentialsController::class, 'show']);
    Route::put('panel/settings/sms-spotplayer-credentials', [SmsSpotplayerCredentialsController::class, 'update']);
    Route::post('panel/settings/sms-spotplayer-credentials/test', [SmsSpotplayerCredentialsController::class, 'test']);

    Route::get('panel/leads/export', LeadExportController::class);
    Route::get('panel/orders/export', OrderExportController::class);
    Route::get('panel/students/export', StudentExportController::class);

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
    Route::post('students/{student}/reveal-mobile', [AdminStudentController::class, 'revealMobile'])
        ->middleware('throttle:identity-reveal')
        ->whereNumber('student');
    Route::post('students/{student}/reveal-national-code', [AdminStudentController::class, 'revealNationalCode'])
        ->middleware('throttle:identity-reveal')
        ->whereNumber('student');

    Route::get('identity-verifications/dashboard', [IdentityVerificationAdminController::class, 'dashboard']);
    Route::get('identity-verifications', [IdentityVerificationAdminController::class, 'index']);
    Route::get('identity-verifications/next', [IdentityVerificationAdminController::class, 'next']);
    Route::get('identity-verifications/{submission}', [IdentityVerificationAdminController::class, 'show'])->whereNumber('submission');
    Route::post('identity-verifications/{submission}/approve', [IdentityVerificationAdminController::class, 'approve'])->whereNumber('submission');
    Route::post('identity-verifications/{submission}/reject', [IdentityVerificationAdminController::class, 'reject'])->whereNumber('submission');
    Route::post('identity-verifications/{submission}/request-correction', [IdentityVerificationAdminController::class, 'requestCorrection'])->whereNumber('submission');
    Route::post('students/{student}/identity/unlock-ownership', [IdentityVerificationAdminController::class, 'unlockOwnership'])->whereNumber('student');
    Route::post('students/{student}/identity/override-level', [IdentityVerificationAdminController::class, 'overrideLevel'])->whereNumber('student');
    Route::get('identity-artifacts/{artifact}/stream', [IdentityArtifactController::class, 'stream'])->whereNumber('artifact');

    Route::get('identity-providers', [IdentityProviderAdminController::class, 'index']);
    Route::patch('identity-routes/{route}', [IdentityProviderAdminController::class, 'updateRoute'])->whereNumber('route');
    Route::put('identity-providers/{slug}', [IdentityProviderAdminController::class, 'updateProvider']);
    Route::post('identity-providers/{slug}/test', [IdentityProviderAdminController::class, 'testConnection']);

    Route::get('roles', [RoleAdminController::class, 'index']);
    Route::get('roles/admins', [RoleAdminController::class, 'admins']);
    Route::post('roles/admins', [RoleAdminController::class, 'storeAdmin']);
    Route::match(['post', 'patch'], 'roles/admins/{admin}', [RoleAdminController::class, 'assignAdminRole'])->whereNumber('admin');
    Route::delete('roles/admins/{admin}', [RoleAdminController::class, 'destroyAdmin'])->whereNumber('admin');
    Route::post('roles', [RoleAdminController::class, 'store']);
    Route::match(['put', 'patch'], 'roles/{role}', [RoleAdminController::class, 'update'])->whereNumber('role');

    Route::get('audit-logs', [AuditLogAdminController::class, 'index']);

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
    Route::get('sat-integration', [SatIntegrationAdminController::class, 'show']);
    Route::patch('sat-integration', [SatIntegrationAdminController::class, 'update']);
    Route::post('sat-integration/test', [SatIntegrationAdminController::class, 'test']);
    Route::post('sat-applications/{satApplication}/resync', [SatIntegrationAdminController::class, 'resync'])->whereNumber('satApplication');

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
    Route::post('sms/center-config/events/{eventKey}/test', [SmsCenterConfigController::class, 'testEvent']);
    Route::put('sms/center-config/admin-telegram/events/{eventKey}', [SmsCenterConfigController::class, 'updateAdminTelegramEvent']);
    Route::post('sms/center-config/admin-telegram/test', [SmsCenterConfigController::class, 'testAdminTelegram']);

    Route::post('imports/students/preview', [ImportAdminController::class, 'preview']);
    Route::post('imports/students/commit', [ImportAdminController::class, 'commit']);
});

Route::get('cache/public', [CacheController::class, 'publicConfig']);
Route::post('internal/cache/verify-revalidate', [CacheController::class, 'verifyRevalidate'])
    ->middleware('throttle:120,1');
Route::get('settings', [SettingController::class, 'publicIndex']);

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

/*
|--------------------------------------------------------------------------
| Family — "خانواده داداش بهرام" (public feed usable by guests + members)
|--------------------------------------------------------------------------
*/
Route::prefix('family')->group(function () {
    // Guest preview + member feed both hit index(); controller checks auth.
    Route::get('feed', [FamilyFeedController::class, 'index'])->middleware('throttle:120,1');
    Route::get('feed/unread-summary', [FamilyFeedController::class, 'unreadSummary'])->middleware('throttle:120,1');
    Route::get('branding', [FamilyBrandingController::class, 'show'])->middleware('throttle:120,1');
    Route::get('posts/{post}', [FamilyFeedController::class, 'show'])->whereNumber('post')->middleware('throttle:120,1');
    Route::get('pulse', [FamilyPulseController::class, 'index'])->middleware('throttle:60,1');

    Route::middleware(['auth:sanctum', 'student.active'])->group(function () {
        Route::get('me', [FamilyFeedController::class, 'me']);
        Route::get('pinned', [FamilyFeedController::class, 'pinned']);
        Route::get('posts/{post}/jump', [FamilyFeedController::class, 'jump'])
            ->whereNumber('post')->middleware('throttle:120,1');
        Route::get('stories', [FamilyStoryController::class, 'index'])->middleware('throttle:120,1');
        Route::post('join', [FamilyFeedController::class, 'join'])->middleware('throttle:20,1');
        Route::post('onboarding/complete', [FamilyFeedController::class, 'completeOnboarding']);

        Route::put('posts/{post}/reaction', [FamilyReactionController::class, 'upsert'])
            ->whereNumber('post')->middleware('throttle:family-reaction');
        Route::delete('posts/{post}/reaction', [FamilyReactionController::class, 'destroy'])
            ->whereNumber('post')->middleware('throttle:family-reaction');

        Route::post('posts/{post}/view', [FamilyPostViewController::class, 'store'])
            ->whereNumber('post')->middleware('throttle:120,1');

        Route::get('posts/{post}/comments', [FamilyCommentController::class, 'index'])->whereNumber('post');
        Route::post('posts/{post}/comments', [FamilyCommentController::class, 'store'])
            ->whereNumber('post')->middleware('throttle:family-comment');

        Route::post('actions/{action}/respond', [FamilyActionController::class, 'respond'])
            ->whereNumber('action')->middleware('throttle:family-action');

        Route::post('media-progress', [FamilyMediaProgressController::class, 'upsert'])
            ->middleware('throttle:family-progress');

        Route::get('notifications', [StudentNotificationController::class, 'index']);
        Route::get('notifications/unread-count', [StudentNotificationController::class, 'unreadCount']);
        Route::post('notifications/read-all', [StudentNotificationController::class, 'markAllRead']);
        Route::post('notifications/{notification}/read', [StudentNotificationController::class, 'markRead']);
    });
});

/*
|--------------------------------------------------------------------------
| Family Manager — Bahram + authorized admins (Flutter app + admin panel)
|--------------------------------------------------------------------------
*/
Route::prefix('family-manager')->middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::get('home', [FamilyManagerHomeController::class, 'index'])->middleware('family.manage:family.analytics.view');

    Route::get('posts', [FamilyManagerPostController::class, 'index'])->middleware('family.manage:family.posts.create');
    Route::post('posts', [FamilyManagerPostController::class, 'store'])->middleware('family.manage:family.posts.create');
    Route::get('posts/{post}', [FamilyManagerPostController::class, 'show'])->whereNumber('post')->middleware('family.manage:family.posts.create');
    Route::get('posts/{post}/action-results', [FamilyManagerPostController::class, 'actionResults'])->whereNumber('post')->middleware('family.manage:family.posts.create');
    Route::get('posts/{post}/action-results/export', [FamilyManagerPostController::class, 'exportActionResults'])->whereNumber('post')->middleware('family.manage:family.posts.create');
    Route::post('posts/ai-draft', [FamilyManagerPostController::class, 'aiDraft'])->middleware('family.manage:family.posts.create');
    Route::patch('posts/{post}', [FamilyManagerPostController::class, 'update'])->whereNumber('post')->middleware('family.manage:family.posts.create');
    Route::post('posts/{post}/publish', [FamilyManagerPostController::class, 'publish'])->whereNumber('post')->middleware('family.manage:family.posts.publish');
    Route::post('posts/{post}/archive', [FamilyManagerPostController::class, 'archive'])->whereNumber('post')->middleware('family.manage:family.posts.publish');
    Route::post('posts/{post}/recover', [FamilyManagerPostController::class, 'recover'])->whereNumber('post')->middleware('family.manage:family.posts.publish');
    Route::post('posts/{post}/pin', [FamilyManagerPostController::class, 'pin'])->whereNumber('post')->middleware('family.manage:family.posts.publish');
    Route::post('posts/{post}/unpin', [FamilyManagerPostController::class, 'unpin'])->whereNumber('post')->middleware('family.manage:family.posts.publish');
    Route::delete('posts/{post}', [FamilyManagerPostController::class, 'destroy'])->whereNumber('post')->middleware('family.manage:family.posts.publish');
    Route::post('posts/{comment}/reply', [FamilyManagerPostController::class, 'reply'])->whereNumber('comment')->middleware('family.manage:family.comments.reply');

    Route::get('comments', [FamilyManagerCommentModerationController::class, 'index'])->middleware('family.manage:family.comments.moderate');
    Route::post('comments/{comment}/approve', [FamilyManagerCommentModerationController::class, 'approve'])->whereNumber('comment')->middleware('family.manage:family.comments.moderate');
    Route::post('comments/{comment}/reject', [FamilyManagerCommentModerationController::class, 'reject'])->whereNumber('comment')->middleware('family.manage:family.comments.moderate');
    Route::post('comments/batch-approve', [FamilyManagerCommentModerationController::class, 'batchApprove'])->middleware('family.manage:family.comments.moderate');
    Route::post('comments/{comment}/mark-important', [FamilyManagerCommentModerationController::class, 'markImportant'])->whereNumber('comment')->middleware('family.manage:family.comments.moderate');
    Route::post('comments/{comment}/pulse', [FamilyManagerCommentModerationController::class, 'togglePulse'])->whereNumber('comment')->middleware('family.manage:family.pulse.manage');
    Route::post('comments/{comment}/seen', [FamilyManagerCommentModerationController::class, 'markSeen'])->whereNumber('comment')->middleware('family.manage:family.comments.moderate');

    Route::get('families', [FamilyManagerFamiliesController::class, 'index'])->middleware('family.manage:family.families.view');
    Route::post('families', [FamilyManagerFamiliesController::class, 'store'])->middleware('family.manage:family.families.manage');
    Route::get('families/{family}', [FamilyManagerFamiliesController::class, 'show'])->whereNumber('family')->middleware('family.manage:family.families.view');
    Route::get('families/{family}/members', [FamilyManagerFamiliesController::class, 'familyMembers'])->whereNumber('family')->middleware('family.manage:family.families.view');
    Route::post('families/{family}/members', [FamilyManagerFamiliesController::class, 'storeMember'])->whereNumber('family')->middleware('family.manage:family.families.manage');
    Route::delete('families/{family}/members/{membership}', [FamilyManagerFamiliesController::class, 'destroyMember'])->whereNumber(['family', 'membership'])->middleware('family.manage:family.families.manage');
    Route::patch('families/{family}', [FamilyManagerFamiliesController::class, 'update'])->whereNumber('family')->middleware('family.manage:family.families.manage');
    Route::delete('families/{family}', [FamilyManagerFamiliesController::class, 'destroy'])->whereNumber('family')->middleware('family.manage:family.families.manage');
    Route::get('members', [FamilyManagerFamiliesController::class, 'members'])->middleware('family.manage:family.families.view');
    Route::get('entry-events', [FamilyManagerFamiliesController::class, 'entryEvents'])->middleware('family.manage:family.families.view');

    Route::get('entry-links', [FamilyManagerEntryLinksController::class, 'index'])->middleware('family.manage:family.entry_links.manage');
    Route::post('entry-links', [FamilyManagerEntryLinksController::class, 'store'])->middleware('family.manage:family.entry_links.manage');
    Route::get('entry-links/{entryLink}/members', [FamilyManagerEntryLinksController::class, 'members'])->whereNumber('entryLink')->middleware('family.manage:family.families.view');
    Route::get('entry-links/{entryLink}', [FamilyManagerEntryLinksController::class, 'show'])->whereNumber('entryLink')->middleware('family.manage:family.entry_links.manage');
    Route::patch('entry-links/{entryLink}', [FamilyManagerEntryLinksController::class, 'update'])->whereNumber('entryLink')->middleware('family.manage:family.entry_links.manage');
    Route::delete('entry-links/{entryLink}', [FamilyManagerEntryLinksController::class, 'destroy'])->whereNumber('entryLink')->middleware('family.manage:family.entry_links.manage');

    Route::get('audience-suggestions', [FamilyManagerFamiliesController::class, 'audienceSuggestions'])->middleware('family.manage:family.families.view');

    Route::get('analytics', [FamilyManagerAnalyticsController::class, 'index'])->middleware('family.manage:family.analytics.view');
    Route::get('analytics/daily-summary', [FamilyManagerAnalyticsController::class, 'dailySummary'])->middleware('family.manage:family.analytics.view');

    Route::get('settings', [FamilyManagerSettingsController::class, 'show'])->middleware('family.manage:family.settings.manage');
    Route::patch('settings', [FamilyManagerSettingsController::class, 'update'])->middleware('family.manage:family.settings.manage');
    Route::patch('settings/media-pipeline', [FamilyManagerSettingsController::class, 'updateMediaPipeline'])->middleware('family.manage:family.settings.manage');
    Route::patch('settings/ai', [FamilyManagerSettingsController::class, 'updateAi'])->middleware('family.manage:family.settings.manage');
    Route::post('settings/ai/test', [FamilyManagerSettingsController::class, 'testAi'])->middleware('family.manage:family.settings.manage');
    Route::get('settings/ai/providers', [FamilyManagerSettingsController::class, 'aiProviders'])->middleware('family.manage:family.settings.manage');

    Route::get('stories', [FamilyManagerStoryController::class, 'index'])->middleware('family.manage:family.stories.manage');
    Route::post('stories', [FamilyManagerStoryController::class, 'store'])->middleware('family.manage:family.stories.manage');
    Route::delete('stories/{story}', [FamilyManagerStoryController::class, 'destroy'])->whereNumber('story')->middleware('family.manage:family.stories.manage');

    Route::post('media', [FamilyManagerMediaController::class, 'store'])->middleware(['family.manage:family.media.upload', 'throttle:family-upload']);
    Route::post('media/sessions', [FamilyManagerMediaController::class, 'createSession'])->middleware(['family.manage:family.media.upload', 'throttle:family-upload']);
    Route::post('media/sessions/{session:ulid}/chunk', [FamilyManagerMediaController::class, 'uploadChunk'])->middleware('family.manage:family.media.upload');
    Route::post('media/sessions/{session:ulid}/complete', [FamilyManagerMediaController::class, 'completeSession'])->middleware('family.manage:family.media.upload');
    Route::get('media/{medium}', [FamilyManagerMediaController::class, 'show'])->whereNumber('medium')->middleware('family.manage:family.media.upload');
    Route::post('media/{medium}/retry', [FamilyManagerMediaController::class, 'retry'])->whereNumber('medium')->middleware('family.manage:family.media.upload');
});
