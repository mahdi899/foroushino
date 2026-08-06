<?php

namespace App\Services;

use App\Enums\ReferralConversionStatus;
use App\Models\LandingPage;
use App\Models\Lead;
use App\Models\User;
use App\Support\Mobile;
use Illuminate\Support\Collection;

/**
 * Resolves named audience segments (used by the SMS center and admin
 * notification composer) into a collection of students.
 */
class AudienceSegmentService
{
    public const SEGMENTS = [
        'all_students' => 'همه دانشجویان',
        'course_buyers' => 'خریداران دوره',
        'seminar_attendees' => 'شرکت‌کنندگان سمینار',
        'incomplete_profiles' => 'پروفایل ناقص',
        'sat_submitted' => 'ثبت‌کننده سات',
        'sat_not_submitted' => 'بدون ثبت سات',
        'successful_referrers' => 'معرف‌های موفق',
    ];

    /** Segment key for the union of every landing page's form leads. */
    public const LANDING_LEADS_ALL = 'landing_leads_all';

    /** Prefix for per-landing-page segment keys, e.g. `landing:5`. */
    public const LANDING_PREFIX = 'landing:';

    /** @return Collection<int, User> */
    public function resolve(string $segment): Collection
    {
        $query = User::query()->where('is_admin', false)->whereNotNull('mobile');

        $query = match ($segment) {
            'course_buyers' => $query->whereHas('courseAccesses'),
            'seminar_attendees' => $query->whereHas('seminarAttendances'),
            'incomplete_profiles' => $query->whereDoesntHave('profile'),
            'sat_submitted' => $query->whereHas('satApplications'),
            'sat_not_submitted' => $query->whereDoesntHave('satApplications'),
            'successful_referrers' => $query->whereHas(
                'referralConversionsAsReferrer',
                fn ($q) => $q->where('status', ReferralConversionStatus::Approved)
            ),
            default => $query,
        };

        return $query->get();
    }

    /**
     * Segment list for the SMS center: student segments plus one entry per
     * landing page (and a union "all landing leads" entry).
     *
     * @return array<int, array{key: string, label: string, count: int}>
     */
    public function listForSms(): array
    {
        $studentSegments = collect(self::SEGMENTS)->map(fn ($label, $key) => [
            'key' => $key,
            'label' => $label,
            'count' => $this->resolve($key)->count(),
        ])->values();

        $landingSegments = collect([[
            'key' => self::LANDING_LEADS_ALL,
            'label' => 'همه لیدهای لندینگ',
            'count' => $this->resolveSmsMobiles(self::LANDING_LEADS_ALL)->count(),
        ]]);

        $perLandingPage = LandingPage::query()
            ->orderByDesc('id')
            ->get(['id', 'title'])
            ->map(fn (LandingPage $page) => [
                'key' => self::LANDING_PREFIX.$page->id,
                'label' => 'لندینگ «'.$page->title.'»',
                'count' => $this->resolveSmsMobiles(self::LANDING_PREFIX.$page->id)->count(),
            ]);

        return $studentSegments
            ->concat($landingSegments)
            ->concat($perLandingPage)
            ->all();
    }

    /**
     * Resolves an SMS segment key (student segment or landing-lead segment)
     * into a map of normalized mobile => nullable user id.
     *
     * @return Collection<string, int|null>
     */
    public function resolveSmsMobiles(string $segment): Collection
    {
        if ($segment === self::LANDING_LEADS_ALL) {
            return $this->landingLeadMobiles(fn ($query) => $query->whereNotNull('landing_page_id'));
        }

        if (str_starts_with($segment, self::LANDING_PREFIX)) {
            $landingPageId = (int) substr($segment, strlen(self::LANDING_PREFIX));

            return $this->landingLeadMobiles(fn ($query) => $query->where('landing_page_id', $landingPageId));
        }

        $mobiles = collect();
        foreach ($this->resolve($segment) as $user) {
            $normalized = Mobile::normalize($user->mobile);
            if ($normalized) {
                $mobiles[$normalized] = $user->id;
            }
        }

        return $mobiles;
    }

    public function isValidSmsSegment(string $segment): bool
    {
        if (array_key_exists($segment, self::SEGMENTS)) {
            return true;
        }

        if ($segment === self::LANDING_LEADS_ALL) {
            return true;
        }

        if (str_starts_with($segment, self::LANDING_PREFIX)) {
            $landingPageId = substr($segment, strlen(self::LANDING_PREFIX));

            return ctype_digit($landingPageId) && LandingPage::query()->whereKey($landingPageId)->exists();
        }

        return false;
    }

    /**
     * @param  \Closure(\Illuminate\Database\Eloquent\Builder<Lead>): \Illuminate\Database\Eloquent\Builder<Lead>  $scope
     * @return Collection<string, int|null>
     */
    private function landingLeadMobiles(\Closure $scope): Collection
    {
        $query = Lead::query()->whereNotNull('phone');
        $query = $scope($query);

        $mobiles = collect();
        foreach ($query->pluck('phone') as $phone) {
            $normalized = Mobile::normalize($phone);
            if ($normalized) {
                $mobiles[$normalized] ??= null;
            }
        }

        return $mobiles;
    }
}
