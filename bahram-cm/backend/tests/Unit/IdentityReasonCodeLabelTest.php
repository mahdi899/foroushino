<?php

namespace Tests\Unit;

use App\Enums\IdentityReasonCode;
use Tests\TestCase;

class IdentityReasonCodeLabelTest extends TestCase
{
    public function test_labels_for_list_maps_codes_to_persian(): void
    {
        $labels = IdentityReasonCode::labelsForList([
            'national_card_unreadable',
            'selfie_unsuitable',
            'national_card_unreadable',
            'تصویر ناقص است',
        ]);

        $this->assertSame([
            'تصویر کارت ملی خوانا نیست',
            'ویدیوی سلفی مناسب نیست',
            'تصویر ناقص است',
        ], $labels);
    }
}
