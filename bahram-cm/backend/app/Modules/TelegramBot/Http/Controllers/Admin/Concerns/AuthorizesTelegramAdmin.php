<?php

namespace App\Modules\TelegramBot\Http\Controllers\Admin\Concerns;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

trait AuthorizesTelegramAdmin
{
    protected function authorizeTelegram(Request $request, string $permission): User
    {
        /** @var User|null $user */
        $user = $request->user();
        abort_unless($user && ($user->isSuperAdmin() || $user->hasPermission($permission)), 403);

        return $user;
    }

    /** @param  callable(mixed): array<string, mixed>  $mapper */
    protected function paginatedResponse(LengthAwarePaginator $paginator, callable $mapper): JsonResponse
    {
        return response()->json([
            'data' => $paginator->getCollection()->map($mapper)->values(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    protected function maskMobile(?string $mobile): ?string
    {
        if (blank($mobile) || mb_strlen($mobile) < 7) {
            return $mobile;
        }

        return mb_substr($mobile, 0, 4).'***'.mb_substr($mobile, -2);
    }
}
