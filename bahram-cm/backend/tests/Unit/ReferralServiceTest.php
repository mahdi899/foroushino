<?php

namespace Tests\Unit;

use App\Services\ReferralService;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class ReferralServiceTest extends TestCase
{
    public function test_referral_link_matches_student_panel_format(): void
    {
        Config::set('app.frontend_url', 'https://rostami.app');

        $link = (new ReferralService)->referralLink('BRM-20449');

        $this->assertSame('https://rostami.app/?ref=BRM-20449', $link);
    }
}
