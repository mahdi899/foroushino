<?php

namespace Tests\Unit;

use App\Support\FamilyCommentBodyGuard;
use PHPUnit\Framework\TestCase;

class FamilyCommentBodyGuardTest extends TestCase
{
    public function test_detects_iranian_mobile_formats(): void
    {
        $this->assertTrue(FamilyCommentBodyGuard::containsPhoneNumber('با من تماس بگیر 09123456789'));
        $this->assertTrue(FamilyCommentBodyGuard::containsPhoneNumber('شماره: ۰۹۱۲۳۴۵۶۷۸۹'));
        $this->assertTrue(FamilyCommentBodyGuard::containsPhoneNumber('0912-345-6789'));
        $this->assertTrue(FamilyCommentBodyGuard::containsPhoneNumber('+98 912 345 6789'));
    }

    public function test_ignores_plain_text_without_phone(): void
    {
        $this->assertFalse(FamilyCommentBodyGuard::containsPhoneNumber('سلام، ممنون از پست عالی'));
        $this->assertFalse(FamilyCommentBodyGuard::containsPhoneNumber('فردا ساعت ۱۰ می‌بینمت'));
    }

    public function test_detects_links_and_handles(): void
    {
        $this->assertTrue(FamilyCommentBodyGuard::containsLink('ببین https://example.com/offer'));
        $this->assertTrue(FamilyCommentBodyGuard::containsLink('www.shop.ir/x'));
        $this->assertTrue(FamilyCommentBodyGuard::containsLink('t.me/bahram'));
        $this->assertTrue(FamilyCommentBodyGuard::containsLink('پیگیری در @SupportTeam'));
        $this->assertFalse(FamilyCommentBodyGuard::containsLink('سلام خانواده عالی بود'));
    }

    public function test_detects_negative_scam_language(): void
    {
        $this->assertTrue(FamilyCommentBodyGuard::containsNegativeLanguage('این آدم کلاهبرداره'));
        $this->assertTrue(FamilyCommentBodyGuard::containsNegativeLanguage('کلاه برداری محض'));
        $this->assertFalse(FamilyCommentBodyGuard::containsNegativeLanguage('ممنون از راهنمایی خوبت'));
    }

    public function test_analyze_raises_risk_for_manual_review(): void
    {
        $phone = FamilyCommentBodyGuard::analyze('تماس 09123456789');
        $this->assertTrue($phone['requires_manual_review']);
        $this->assertContains('phone_number', $phone['signals']);
        $this->assertGreaterThanOrEqual(0.55, $phone['min_risk']);

        $link = FamilyCommentBodyGuard::analyze('لینک https://bad.example/x');
        $this->assertTrue($link['requires_manual_review']);
        $this->assertContains('external_link', $link['signals']);

        $insult = FamilyCommentBodyGuard::analyze('کلاهبردار');
        $this->assertTrue($insult['requires_manual_review']);
        $this->assertContains('insult', $insult['signals']);
    }

    public function test_enrich_analysis_floors_risk_even_if_ai_is_low(): void
    {
        $enriched = FamilyCommentBodyGuard::enrichAnalysis('کلاهبردار https://x.com 09123456789', [
            'risk_score' => 0.1,
            'sentiment' => 'positive',
            'topic' => 'تست',
            'signals' => ['safe'],
        ]);

        $this->assertGreaterThanOrEqual(0.6, $enriched['risk_score']);
        $this->assertContains('insult', $enriched['signals']);
        $this->assertContains('external_link', $enriched['signals']);
        $this->assertContains('phone_number', $enriched['signals']);
        $this->assertNotContains('safe', $enriched['signals']);
    }
}
