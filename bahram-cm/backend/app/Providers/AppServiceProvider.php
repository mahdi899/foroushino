<?php

namespace App\Providers;

use App\Events\IdentityLevel2Approved;
use App\Events\SatApplicationAccepted;
use App\Events\SatMembershipActivated;
use App\Listeners\NotifySatTelegramGroupAccessListener;
use App\Listeners\PushSatApplicationToExternalListener;
use App\Listeners\TryActivateSatMembershipListener;
use App\Models\FamilyMedia;
use App\Models\PersonalAccessToken;
use App\Models\Seminar;
use App\Models\SeminarAttendee;
use App\Observers\FamilyMediaObserver;
use App\Observers\SeminarAttendeeObserver;
use App\Observers\SeminarObserver;
use App\Support\MediaFtpConnection;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Broadcast::routes(['middleware' => ['auth:sanctum']]);

        FamilyMedia::observe(FamilyMediaObserver::class);
        Seminar::observe(SeminarObserver::class);
        SeminarAttendee::observe(SeminarAttendeeObserver::class);

        // Short-TTL cache around Sanctum's per-request token->user lookup —
        // see App\Models\PersonalAccessToken for the invalidation strategy.
        Sanctum::usePersonalAccessTokenModel(PersonalAccessToken::class);

        $this->configureDynamicMediaDisk();

        RateLimiter::for('api', function (Request $request) {
            $perMinute = max(1, (int) config('bahram.api_rate_limit_per_minute', 120));

            return Limit::perMinute($perMinute)->by($request->ip());
        });

        RateLimiter::for('student-auth', function (Request $request) {
            $perMinute = max(1, (int) config('bahram.student_auth_rate_limit_per_minute', 30));

            return Limit::perMinute($perMinute)->by($request->ip());
        });

        RateLimiter::for('leads', function (Request $request) {
            return [
                Limit::perMinute(5)->by($request->ip()),
                Limit::perDay(50)->by($request->ip()),
            ];
        });

        RateLimiter::for('chatbot', function (Request $request) {
            return Limit::perMinute(20)->by($request->ip());
        });

        RateLimiter::for('admin-login', function (Request $request) {
            return Limit::perHour((int) config('bahram.admin_login.max_per_hour', 3))
                ->by($request->ip());
        });

        RateLimiter::for('identity-reveal', function (Request $request) {
            return Limit::perMinute(30)->by((string) ($request->user()?->id ?: $request->ip()));
        });

        RateLimiter::for('identity-submit', function (Request $request) {
            return Limit::perMinute(5)->by((string) ($request->user()?->id ?: $request->ip()));
        });

        RateLimiter::for('ownership-verify', function (Request $request) {
            return Limit::perMinute(10)->by((string) ($request->user()?->id ?: $request->ip()));
        });

        RateLimiter::for('bank-account-verify', function (Request $request) {
            return Limit::perMinute(5)->by((string) ($request->user()?->id ?: $request->ip()));
        });

        RateLimiter::for('family-comment', function (Request $request) {
            return Limit::perMinute((int) config('family.rate_limits.comment_per_minute', 5))
                ->by((string) ($request->user()?->id ?: $request->ip()));
        });

        RateLimiter::for('family-reaction', function (Request $request) {
            return Limit::perMinute((int) config('family.rate_limits.reaction_per_minute', 30))
                ->by((string) ($request->user()?->id ?: $request->ip()));
        });

        RateLimiter::for('family-action', function (Request $request) {
            return Limit::perMinute((int) config('family.rate_limits.action_per_minute', 10))
                ->by((string) ($request->user()?->id ?: $request->ip()));
        });

        RateLimiter::for('family-progress', function (Request $request) {
            return Limit::perMinute((int) config('family.rate_limits.progress_per_minute', 60))
                ->by((string) ($request->user()?->id ?: $request->ip()));
        });

        RateLimiter::for('family-upload', function (Request $request) {
            return Limit::perHour((int) config('family.rate_limits.upload_per_hour', 40))
                ->by((string) ($request->user()?->id ?: $request->ip()));
        });

        // Server-to-server integration routes (SAT inbound) — keyed by the
        // caller's IP since these are pre-auth (proxy-origin gate runs first).
        RateLimiter::for('integration', function (Request $request) {
            return Limit::perMinute(60)->by($request->ip());
        });

        Event::listen(IdentityLevel2Approved::class, TryActivateSatMembershipListener::class);
        Event::listen(SatApplicationAccepted::class, TryActivateSatMembershipListener::class);
        Event::listen(SatApplicationAccepted::class, PushSatApplicationToExternalListener::class);
        Event::listen(SatMembershipActivated::class, NotifySatTelegramGroupAccessListener::class);
    }

    /**
     * If an admin has saved FTP/SFTP connection details from the media
     * panel, override the static `site_media_ftp`/`site_media_sftp` disk
     * config (and the active `bahram.uploads.public_disk`) for this
     * request/worker — every existing call site that resolves the disk by
     * name (`Storage::disk($media->disk)`, `config('bahram.uploads.public_disk')`)
     * transparently picks up the panel-managed credentials with no further
     * code changes. Silently skipped before the `settings` table exists
     * (fresh install, running migrations) or if the DB is unreachable.
     */
    private function configureDynamicMediaDisk(): void
    {
        try {
            if (! Schema::hasTable('settings')) {
                return;
            }

            if (! MediaFtpConnection::isReady()) {
                return;
            }

            $diskName = MediaFtpConnection::diskName();
            $diskConfig = MediaFtpConnection::toDiskConfig();

            config(["filesystems.disks.{$diskName}" => $diskConfig]);
            config(['bahram.uploads.public_disk' => $diskName]);
            config(['filesystems.disks.family_media_ftp' => array_merge($diskConfig, ['throw' => true])]);
        } catch (\Throwable) {
            // DB not reachable yet at this point in the boot cycle — the
            // static env-based disk config (if any) remains in effect.
        }
    }
}
