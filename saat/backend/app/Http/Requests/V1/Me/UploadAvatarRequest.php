<?php

namespace App\Http\Requests\V1\Me;

use Illuminate\Foundation\Http\FormRequest;

class UploadAvatarRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'avatar' => ['required', 'file', 'image', 'mimes:jpeg,jpg,png,webp', 'max:2048'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'avatar.required' => 'فایل عکس انتخاب نشده است.',
            'avatar.image' => 'فایل انتخاب‌شده باید یک تصویر باشد.',
            'avatar.mimes' => 'فرمت مجاز: JPG، PNG یا WebP.',
            'avatar.max' => 'حداکثر حجم عکس ۲ مگابایت است.',
        ];
    }
}
