<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum CallResult: string
{
    use EnumValues;

    case Interested = 'interested';
    case VeryHot = 'very_hot';
    case NeedsFollowup = 'needs_followup';
    case MeetingSet = 'meeting_set';
    case PaymentPending = 'payment_pending';
    case Registered = 'registered';
    case NoAnswer = 'no_answer';
    case Unavailable = 'unavailable';
    case WrongNumber = 'wrong_number';
    case NotInterested = 'not_interested';
    case DoNotDisturb = 'do_not_disturb';
    case NeedsInfo = 'needs_info';
    case NotDecisionMaker = 'not_decision_maker';
    case CallLater = 'call_later';
    case Duplicate = 'duplicate';
    case PriceObjection = 'price_objection';
    case BadTiming = 'bad_timing';
    case IncompleteCall = 'incomplete_call';

    public function label(): string
    {
        return match ($this) {
            self::Interested => 'علاقه‌مند',
            self::VeryHot => 'خیلی داغ',
            self::NeedsFollowup => 'نیاز به پیگیری',
            self::MeetingSet => 'جلسه تنظیم شد',
            self::PaymentPending => 'پرداخت در انتظار',
            self::Registered => 'ثبت‌نام شد',
            self::NoAnswer => 'پاسخ نداد',
            self::Unavailable => 'خاموش / در دسترس نبود',
            self::WrongNumber => 'شماره اشتباه',
            self::NotInterested => 'علاقه‌مند نیست',
            self::DoNotDisturb => 'مزاحم نشو',
            self::NeedsInfo => 'نیاز به اطلاعات بیشتر',
            self::NotDecisionMaker => 'تصمیم‌گیرنده نیست',
            self::CallLater => 'بعداً تماس بگیر',
            self::Duplicate => 'تکراری',
            self::PriceObjection => 'قیمت بالا بود',
            self::BadTiming => 'زمان مناسب نبود',
            self::IncompleteCall => 'تماس ناقص ماند',
        };
    }

    /**
     * Results considered a "positive" / successful contact for stats.
     *
     * @return array<int, self>
     */
    public static function positive(): array
    {
        return [self::Interested, self::VeryHot, self::MeetingSet, self::PaymentPending, self::Registered];
    }
}
