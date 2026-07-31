<?php

namespace App\Http\Requests\Family;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFamilyDisplayNameRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'min:2', 'max:60'],
            'last_name' => ['required', 'string', 'min:2', 'max:60'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'first_name.required' => 'نام را وارد کنید.',
            'first_name.min' => 'نام باید حداقل ۲ حرف باشد.',
            'last_name.required' => 'نام خانوادگی را وارد کنید.',
            'last_name.min' => 'نام خانوادگی باید حداقل ۲ حرف باشد.',
        ];
    }
}
