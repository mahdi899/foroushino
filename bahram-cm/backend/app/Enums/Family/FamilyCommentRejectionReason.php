<?php

namespace App\Enums\Family;

use App\Enums\Concerns\EnumValues;

enum FamilyCommentRejectionReason: string
{
    use EnumValues;

    case ContactInformation = 'contact_information';
    case Advertisement = 'advertisement';
    case Insult = 'insult';
    case Irrelevant = 'irrelevant';
    case RuleViolation = 'rule_violation';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::ContactInformation => 'این نظر شامل اطلاعات تماس بود.',
            self::Advertisement => 'این نظر جنبه تبلیغاتی داشت.',
            self::Insult => 'این نظر شامل توهین بود.',
            self::Irrelevant => 'این نظر مرتبط با موضوع نبود.',
            self::RuleViolation => 'این نظر با قوانین خانواده سازگار نبود.',
            self::Other => 'این نظر منتشر نشد.',
        };
    }
}
