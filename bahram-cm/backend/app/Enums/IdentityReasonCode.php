<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum IdentityReasonCode: string
{
    use EnumValues;

    case NationalCardUnreadable = 'national_card_unreadable';
    case NationalCardNotYours = 'national_card_not_yours';
    case SelfieUnsuitable = 'selfie_unsuitable';
    case InfoMismatch = 'info_mismatch';
    case ImageIncomplete = 'image_incomplete';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::NationalCardUnreadable => 'تصویر کارت ملی خوانا نیست',
            self::NationalCardNotYours => 'کارت ملی متعلق به شما نیست',
            self::SelfieUnsuitable => 'ویدیوی سلفی مناسب نیست',
            self::InfoMismatch => 'اطلاعات با مدارک مطابقت ندارد',
            self::ImageIncomplete => 'تصویر ناقص است',
            self::Other => 'سایر',
        };
    }

    /** Resolve a stored code or already-Persian label to student-facing Persian text. */
    public static function labelFor(string $codeOrLabel): string
    {
        $raw = trim($codeOrLabel);
        if ($raw === '') {
            return $raw;
        }

        $enum = self::tryFrom($raw);

        return $enum?->label() ?? $raw;
    }

    /**
     * @param  list<string>|array<int, string>|null  $items
     * @return list<string>
     */
    public static function labelsForList(?array $items): array
    {
        if ($items === null || $items === []) {
            return [];
        }

        $out = [];
        foreach ($items as $item) {
            if (! is_string($item)) {
                continue;
            }
            $label = self::labelFor($item);
            if ($label !== '' && ! in_array($label, $out, true)) {
                $out[] = $label;
            }
        }

        return $out;
    }
}
