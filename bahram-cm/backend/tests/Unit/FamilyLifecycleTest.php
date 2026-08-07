<?php

namespace Tests\Unit;

use App\Enums\Family\FamilyLifecycle;
use PHPUnit\Framework\TestCase;

class FamilyLifecycleTest extends TestCase
{
    public function test_from_stored_maps_legacy_values(): void
    {
        $this->assertSame(FamilyLifecycle::Active, FamilyLifecycle::fromStored('forming'));
        $this->assertSame(FamilyLifecycle::Active, FamilyLifecycle::fromStored('cooling'));
        $this->assertSame(FamilyLifecycle::Active, FamilyLifecycle::fromStored('active'));
        $this->assertSame(FamilyLifecycle::Inactive, FamilyLifecycle::fromStored('dormant'));
        $this->assertSame(FamilyLifecycle::Inactive, FamilyLifecycle::fromStored('inactive'));
    }
}
