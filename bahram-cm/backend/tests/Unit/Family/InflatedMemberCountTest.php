<?php

namespace Tests\Unit\Family;

use App\Support\InflatedMemberCount;
use PHPUnit\Framework\TestCase;

class InflatedMemberCountTest extends TestCase
{
    public function test_multiplies_by_ten_and_uses_hour_ones_digit(): void
    {
        $this->assertSame(64, InflatedMemberCount::calculate(6, 4));
        $this->assertSame(64, InflatedMemberCount::calculate(6, 14));
        $this->assertSame(66, InflatedMemberCount::calculate(6, 16));
        $this->assertSame(90, InflatedMemberCount::calculate(9, 0));
    }

    public function test_floors_fractional_counts(): void
    {
        $this->assertSame(53, InflatedMemberCount::calculate(5, 3));
    }
}
