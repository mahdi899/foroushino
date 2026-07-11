<?php

namespace App\Support;

final class SensitiveData
{
    public static function maskMobile(?string $mobile): ?string
    {
        return Mobile::mask($mobile);
    }

    public static function maskNationalCode(?string $nationalCode): ?string
    {
        return NationalCode::mask($nationalCode);
    }
}
