<?php

namespace App\Http\Requests\V1\Calls;

use App\Enums\CallResult;
use App\Enums\ObjectionKey;
use App\Models\AppSetting;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubmitCallResultRequest extends FormRequest
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
        $minDuration = max(0, (int) (AppSetting::allKeyed()['min_call_duration_sec'] ?? 0));

        return [
            'result' => ['required', 'string', Rule::in(CallResult::values())],
            'note' => ['nullable', 'string', 'max:2000'],
            'duration_sec' => ['nullable', 'integer', 'min:'.$minDuration],
            'objection' => ['nullable', 'string', Rule::in(ObjectionKey::values())],
            'rating' => ['nullable', 'integer', 'min:1', 'max:5'],

            'follow_up' => ['nullable', 'array'],
            'follow_up.due_at' => ['required_with:follow_up', 'date'],
            'follow_up.kind' => ['nullable', 'string'],
            'follow_up.title' => ['nullable', 'string', 'max:150'],
            'follow_up.note' => ['nullable', 'string', 'max:1000'],
            'follow_up.priority' => ['nullable', 'integer', 'min:1', 'max:3'],

            'sale' => ['nullable', 'array'],
            'sale.amount' => ['required_with:sale', 'numeric', 'min:0'],
            'sale.product_id' => ['nullable', 'integer', 'exists:products,id'],
            'sale.payment_method' => ['nullable', 'string'],
        ];
    }
}
