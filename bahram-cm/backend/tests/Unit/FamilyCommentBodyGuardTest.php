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
}
