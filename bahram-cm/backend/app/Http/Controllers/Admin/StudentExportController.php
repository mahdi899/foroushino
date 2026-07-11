<?php

namespace App\Http\Controllers\Admin;

use App\Models\User;
use App\Services\AdminAuditLogger;
use App\Support\Csv;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StudentExportController
{
    public function __invoke(Request $request, AdminAuditLogger $audit): StreamedResponse
    {
        $user = $request->user();
        abort_if($user === null || ! $user->is_admin, 403);
        abort_unless($user->isSuperAdmin() && $user->hasPermission('students.export'), 403);

        $includeSensitive = $user->hasPermission('students.export_sensitive_data');

        $students = User::query()
            ->where('is_admin', false)
            ->with('profile')
            ->orderBy('id')
            ->get();

        $audit->log($user, 'students.exported', null, [
            'count' => $students->count(),
            'include_sensitive' => $includeSensitive,
        ]);

        $headers = ['id', 'name', 'mobile', 'email', 'status', 'created_at'];
        if (! $includeSensitive) {
            $headers = ['id', 'name', 'mobile_masked', 'email', 'status', 'created_at'];
        }

        return Csv::download('students-export.csv', [
            'headers' => $headers,
            'rows' => $students->map(function (User $s) use ($includeSensitive) {
                if ($includeSensitive) {
                    return [
                        $s->id,
                        $s->name,
                        $s->mobile,
                        $s->email,
                        $s->status->value,
                        $s->created_at?->toDateTimeString(),
                    ];
                }

                return [
                    $s->id,
                    $s->name,
                    \App\Support\Mobile::mask($s->mobile),
                    $s->email,
                    $s->status->value,
                    $s->created_at?->toDateTimeString(),
                ];
            })->all(),
        ]);
    }
}
