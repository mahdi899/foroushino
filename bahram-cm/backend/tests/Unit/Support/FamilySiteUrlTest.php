<?php

namespace Tests\Unit\Support;

use App\Support\FamilySiteUrl;
use Tests\TestCase;

class FamilySiteUrlTest extends TestCase
{
    public function test_post_url_points_to_club_apex_not_family_path(): void
    {
        config(['family.entry.base_url' => 'https://rostami.club']);

        $this->assertSame('https://rostami.club/?post=42', FamilySiteUrl::postUrl(42));
        $this->assertSame('https://rostami.club/', FamilySiteUrl::homeUrl());
        $this->assertSame('https://rostami.club/notifications', FamilySiteUrl::notificationsUrl());
    }

    public function test_post_url_never_uses_localhost_or_app_domain(): void
    {
        config([
            'family.entry.base_url' => 'http://localhost:3000',
            'bahram.frontend_url' => 'http://localhost:3000',
        ]);

        $this->assertSame('https://rostami.club/?post=42', FamilySiteUrl::postUrl(42));
    }

    public function test_legacy_family_path_is_upgraded_to_club_url(): void
    {
        config(['family.entry.base_url' => 'https://rostami.club']);

        $this->assertSame('https://rostami.club/?post=9', FamilySiteUrl::absolute('/family?post=9'));
        $this->assertSame('https://rostami.club/', FamilySiteUrl::absolute('/family'));
    }
}
