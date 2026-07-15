<?php

namespace App\Http\Requests\V1\Admin;

use App\Enums\RoleName;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateTeamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('teams.manage');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:150'],
            'leader_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty() || ! $this->has('leader_id') || $this->input('leader_id') === null) {
                return;
            }

            $leader = User::query()->find($this->integer('leader_id'));
            if ($leader && ! $leader->hasRole(RoleName::Leader->value)) {
                $validator->errors()->add('leader_id', 'لیدر انتخاب‌شده باید نقش لیدر داشته باشد.');
            }
        });
    }
}
