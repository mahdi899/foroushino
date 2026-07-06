<?php

namespace App\Http\Requests\V1\FollowUps;

use Illuminate\Foundation\Http\FormRequest;

class SnoozeFollowUpRequest extends FormRequest
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
            'due_at' => ['required', 'date', 'after:now'],
        ];
    }
}
