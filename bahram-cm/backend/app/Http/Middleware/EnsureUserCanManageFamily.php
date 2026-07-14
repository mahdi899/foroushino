<?php

namespace App\Http\Middleware;

use App\Support\FamilyPermissionCatalog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guards Family Manager API routes. Requires admin + at least one family.* permission
 * (super-admin bypasses via User::hasPermission).
 */
class EnsureUserCanManageFamily
{
    public function handle(Request $request, Closure $next, ?string $permission = null): Response
    {
        $user = $request->user();

        if (! $user || ! $user->is_admin) {
            return response()->json([
                'error' => [
                    'code' => 'forbidden',
                    'message_fa' => 'اجازه دسترسی ندارید.',
                ],
            ], 403);
        }

        $required = $permission ?: 'family.manage';

        if (! $user->hasPermission($required) && ! $this->hasAnyFamilyPermission($user)) {
            return response()->json([
                'error' => [
                    'code' => 'forbidden',
                    'message_fa' => 'اجازه مدیریت خانواده را ندارید.',
                ],
            ], 403);
        }

        if ($permission && ! $user->hasPermission($permission)) {
            return response()->json([
                'error' => [
                    'code' => 'forbidden',
                    'message_fa' => 'اجازه انجام این عملیات را ندارید.',
                ],
            ], 403);
        }

        return $next($request);
    }

    private function hasAnyFamilyPermission(\App\Models\User $user): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        foreach (FamilyPermissionCatalog::all() as $perm) {
            if ($user->hasPermission($perm)) {
                return true;
            }
        }

        return false;
    }
}
