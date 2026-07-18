<?php

namespace App\Providers;

use App\Models\Lead;
use App\Models\PersonalAccessToken;
use App\Observers\LeadObserver;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Lead::observe(LeadObserver::class);

        // Short-TTL cache around Sanctum's per-request token->user lookup —
        // see App\Models\PersonalAccessToken for the invalidation strategy.
        Sanctum::usePersonalAccessTokenModel(PersonalAccessToken::class);

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(300)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('auth', function (Request $request) {
            $perMinute = app()->environment('local', 'testing') ? 120 : 10;

            return Limit::perMinute($perMinute)->by($request->ip());
        });

        RateLimiter::for('writes', function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });

        // Server-to-server integration routes (Bahram inbound) — keyed by the
        // caller's IP since these are pre-auth (proxy-origin gate runs first).
        RateLimiter::for('integration', function (Request $request) {
            return Limit::perMinute(60)->by($request->ip());
        });
    }
}
