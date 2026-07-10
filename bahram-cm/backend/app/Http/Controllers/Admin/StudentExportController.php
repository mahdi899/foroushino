<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Csv;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StudentExportController extends Controller
{
    public function __invoke(Request $request): StreamedResponse
    {
        $user = $request->user();
        abort_if($user === null || ! $user->is_admin, 403);

        $query = User::query()
            ->where('is_admin', false)
            ->with('profile')
            ->withCount(['orders', 'courseAccesses', 'tickets'])
            ->orderByDesc('id');

        $this->applyFilters($query, $request);

        $rows = $query->cursor()->map(function (User $student) {
            $profile = $student->profile;
            $displayName = trim(implode(' ', array_filter([
                $profile?->first_name,
                $profile?->last_name,
            ])));

            return [
                $student->id,
                $student->name,
                $displayName !== '' ? $displayName : $student->name,
                $student->mobile,
                $student->email ?? $profile?->email,
                $this->statusLabel($student->status->value),
                $student->orders_count ?? 0,
                $student->course_accesses_count ?? 0,
                $student->tickets_count ?? 0,
                $student->first_login_at?->format('Y-m-d H:i:s'),
                $student->last_login_at?->format('Y-m-d H:i:s'),
                $student->created_at?->format('Y-m-d H:i:s'),
            ];
        });

        return Csv::download('students-export.csv', [
            'شناسه',
            'نام',
            'نام نمایشی',
            'موبایل',
            'ایمیل',
            'وضعیت',
            'تعداد سفارش',
            'تعداد دوره',
            'تعداد تیکت',
            'اولین ورود',
            'آخرین ورود',
            'تاریخ ثبت',
        ], $rows);
    }

    private function applyFilters(Builder $query, Request $request): void
    {
        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('mobile', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhereHas('profile', function ($profile) use ($search) {
                        $profile->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%");
                    });
            });
        }

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            'active' => 'فعال',
            'suspended' => 'معلق',
            'blocked' => 'مسدود',
            default => $status,
        };
    }
}
