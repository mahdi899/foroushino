<?php

namespace App\Http\Requests\Student;

use Illuminate\Foundation\Http\FormRequest;

class VerifyOtpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'mobile' => ['required', 'string', 'max:20'],
            'code' => ['required', 'string', 'max:10'],
        ];
    }
}
