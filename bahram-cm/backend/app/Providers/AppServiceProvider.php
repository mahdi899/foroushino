<?php

namespace App\Providers;

use App\Events\IdentityLevel2Approved;
use App\Events\SatApplicationAccepted;
use App\Listeners\PushSatApplicationToExternalListener;
use App\Listeners\TryActivateSatMembershipListener;
use App\Models\FamilyMedia;
use App\Observers\FamilyMediaObserver;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

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

        Event::listen(IdentityLevel2Approved::class, TryActivateSatMembershipListener::class);
        Event::listen(SatApplicationAccepted::class, TryActivateSatMembershipListener::class);
        Event::listen(SatApplicationAccepted::class, PushSatApplicationToExternalListener::class);
    }
}
