<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Support\Csv;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LeadExportController extends Controller
{
    public function __invoke(Request $request): StreamedResponse
    {
        $user = $request->user();
        abort_if($user === null || ! $user->is_admin, 403);

        $rows = Lead::query()
            ->orderByDesc('created_at')
            ->cursor()
            ->map(fn (Lead $lead) => [
                $lead->id,
                $lead->name,
                $lead->phone,
                $lead->email,
                $lead->source,
                $lead->status,
                $lead->message,
                $lead->page_url,
                $lead->created_at?->format('Y-m-d H:i:s'),
            ]);

        return Csv::download('leads.csv', [
            'ID', 'نام', 'شماره تماس', 'ایمیل', 'منبع', 'وضعیت', 'پیام', 'آدرس صفحه', 'تاریخ ثبت',
        ], $rows);
    }
}
