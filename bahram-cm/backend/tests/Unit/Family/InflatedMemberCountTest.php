<?php

namespace Tests\Unit\Family;

use App\Support\InflatedMemberCount;
use PHPUnit\Framework\TestCase;

class InflatedMemberCountTest extends TestCase
{
    public function test_maps_anchor_points_with_additive_bonus(): void
    {
        $this->assertSame(0, InflatedMemberCount::calculate(0));
        $this->assertSame(100, InflatedMemberCount::calculate(1));
        $this->assertSame(500, InflatedMemberCount::calculate(50));
        $this->assertSame(600, InflatedMemberCount::calculate(100));
        $this->assertSame(800, InflatedMemberCount::calculate(500));
        $this->assertSame(990, InflatedMemberCount::calculate(999));
        $this->assertSame(1000, InflatedMemberCount::calculate(1000));
        $this->assertSame(1200, InflatedMemberCount::calculate(1200));
    }

    public function test_floors_fractional_counts(): void
    {
        $this->assertSame(100, InflatedMemberCount::calculate(5));
    }
}
