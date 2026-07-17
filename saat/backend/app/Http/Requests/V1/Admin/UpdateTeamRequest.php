<?php

namespace App\Http\Requests\V1\Admin;

use App\Enums\RoleName;
use App\Models\Team;
use App\Models\User;
use App\Support\AdminScope;
use App\Support\TeamScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateTeamRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Team $team */
        $team = $this->route('team');

        return AdminScope::canManageTeam($this->user(), $team);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:150'],
            'leader_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'supervisor_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            if ($this->has('leader_id') && $this->input('leader_id') !== null) {
                $leader = User::query()->find($this->integer('leader_id'));
                if ($leader && ! $leader->hasRole(RoleName::Leader->value)) {
                    $validator->errors()->add('leader_id', 'سرتیم انتخاب‌شده باید نقش سرتیم داشته باشد.');
                }
            }

            $actor = $this->user();
            if ($actor && ! TeamScope::isOrgWide($actor) && $this->has('supervisor_id')) {
                $validator->errors()->add('supervisor_id', 'فقط مدیریت کل می‌تواند ناظر تیم را عوض کند.');
            }
        });
    }
}
