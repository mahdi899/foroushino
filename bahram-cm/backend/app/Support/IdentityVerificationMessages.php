<?php

namespace App\Support;

/**
 * User-facing Persian copy for the student identity verification flow.
 */
final class IdentityVerificationMessages
{
    public const INVALID_NATIONAL_CODE =
        'کد ملی واردشده معتبر نیست. لطفاً ۱۰ رقم کد ملی خود را بدون خط تیره بررسی و دوباره وارد کنید.';

    public const DUPLICATE_NATIONAL_CODE =
        'این کد ملی قبلاً در سامانه ثبت شده است. اگر قبلاً با شمارهٔ دیگری ثبت‌نام کرده‌اید، با همان حساب وارد شوید؛ در غیر این صورت از بخش پشتیبانی راهنمایی بگیرید.';

    public const DRAFT_REQUIRED =
        'ابتدا مرحلهٔ «اطلاعات هویتی» را تکمیل و ذخیره کنید، سپس مدارک را بارگذاری کنید.';

    public const COOLDOWN =
        'درخواست قبلی شما چند لحظه پیش ثبت شده است. لطفاً کمی صبر کنید و دوباره تلاش کنید.';

    public const STATUS_LOCKED =
        'پروندهٔ شما قبلاً ارسال شده و در حال بررسی است. تا اعلام نتیجه امکان ارسال مجدد وجود ندارد.';

    public const ARTIFACTS_REQUIRED =
        'برای ارسال پرونده، بارگذاری تصویر واضح کارت ملی و ضبط ویدیوی سلفی الزامی است.';

    public const CARD_FILE_TOO_LARGE =
        'حجم تصویر کارت ملی بیش از حد مجاز است. لطفاً تصویر با کیفیت مناسب و حجم کمتر انتخاب کنید.';

    public const VIDEO_FILE_TOO_LARGE =
        'حجم ویدیوی سلفی بیش از حد مجاز است. لطفاً ویدیوی کوتاه‌تر ضبط کنید یا کیفیت را کمی کاهش دهید.';

    public const GENERIC_VALIDATION =
        'برخی اطلاعات واردشده ناقص یا نامعتبر است. لطفاً موارد مشخص‌شده را اصلاح کنید.';

    /** @return array<string, string> */
    public static function uploadValidationMessages(): array
    {
        return [
            'type.required' => 'نوع فایل مشخص نشده است.',
            'type.in' => 'نوع فایل ارسالی معتبر نیست.',
            'file.required' => 'فایلی برای بارگذاری انتخاب نشده است.',
            'file.file' => 'فایل ارسالی معتبر نیست. لطفاً دوباره انتخاب کنید.',
            'file.max' => self::CARD_FILE_TOO_LARGE,
        ];
    }

    /** @return array<string, string> */
    public static function draftValidationMessages(): array
    {
        return [
            'first_name.required' => 'نام (مطابق کارت ملی) را وارد کنید.',
            'first_name.max' => 'نام نباید بیش از ۱۰۰ کاراکتر باشد.',
            'last_name.required' => 'نام خانوادگی (مطابق کارت ملی) را وارد کنید.',
            'last_name.max' => 'نام خانوادگی نباید بیش از ۱۰۰ کاراکتر باشد.',
            'national_code.required' => 'کد ملی را وارد کنید.',
            'national_code.max' => 'کد ملی باید ۱۰ رقم باشد.',
            'date_of_birth.required' => 'تاریخ تولد را انتخاب کنید.',
            'date_of_birth.date' => 'تاریخ تولد معتبر نیست. لطفاً دوباره انتخاب کنید.',
            'date_of_birth.before_or_equal' => 'حداقل سن برای ثبت‌نام ۱۰ سال است. تاریخ تولد را اصلاح کنید.',
            'gender.required' => 'جنسیت را انتخاب کنید.',
            'city.required' => 'شهر محل سکونت را وارد کنید.',
            'city.max' => 'نام شهر نباید بیش از ۱۰۰ کاراکتر باشد.',
        ];
    }

    /** @return array<string, string> */
    public static function submitValidationMessages(): array
    {
        return array_merge(self::draftValidationMessages(), [
            'national_card.file' => 'فایل تصویر کارت ملی معتبر نیست.',
            'national_card.max' => self::CARD_FILE_TOO_LARGE,
            'selfie_video.file' => 'فایل ویدیوی سلفی معتبر نیست.',
            'selfie_video.max' => self::VIDEO_FILE_TOO_LARGE,
        ]);
    }
}
