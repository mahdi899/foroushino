<?php

namespace Tests\Unit;

use App\Support\SmsMessage;
use PHPUnit\Framework\TestCase;

class SmsMessageTest extends TestCase
{
    public function test_opt_out_suffix_is_detected_at_end_of_message(): void
    {
        $this->assertTrue(SmsMessage::hasOptOutSuffix('سلام دانشجو. لغو11'));
        $this->assertTrue(SmsMessage::hasOptOutSuffix('سلام دانشجو. لغو11   '));
        $this->assertFalse(SmsMessage::hasOptOutSuffix('لغو11 در ابتدای پیام'));
        $this->assertFalse(SmsMessage::hasOptOutSuffix('بدون پسوند'));
    }
}
