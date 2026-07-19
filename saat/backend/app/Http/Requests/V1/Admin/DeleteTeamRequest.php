<?php

namespace App\Http\Requests\V1\Admin;

use App\Models\Team;
use App\Support\AdminScope;
use Illuminate\Foundation\Http\FormRequest;

class DeleteTeamRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Team $team */
        $team = $this->route('team');

        return (bool) $this->user()?->can('teams.manage')
            && AdminScope::canManageTeam($this->user(), $team);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [];
    }
}
