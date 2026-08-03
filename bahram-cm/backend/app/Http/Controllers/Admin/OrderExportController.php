<?php

namespace App\Http\Controllers\Admin;

use App\Exports\OrdersExport;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Support\AdminOrderFilters;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class OrderExportController extends Controller
{
    public function __invoke(Request $request): BinaryFileResponse
    {
        $user = $request->user();
        abort_if($user === null || ! $user->is_admin, 403);

        $validated = $request->validate([
            'sort' => ['sometimes', 'string', Rule::in(['amount', 'created_at'])],
            'dir' => ['sometimes', 'string', Rule::in(['asc', 'desc'])],
            'from' => ['sometimes', 'date', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'date', 'date_format:Y-m-d'],
            'days' => ['sometimes'],
        ]);

        if (! empty($validated['from']) && ! empty($validated['to']) && $validated['from'] > $validated['to']) {
            throw ValidationException::withMessages([
                'to' => ['تاریخ پایان باید بعد از تاریخ شروع باشد.'],
            ]);
        }

        $sort = $validated['sort'] ?? 'created_at';
        $dir = $validated['dir'] ?? 'desc';

        $query = Order::query()->with('product');

        if ($sort === 'amount') {
            $query->orderBy('final_amount', $dir)->orderBy('id', $dir);
        } else {
            $query->orderBy('created_at', $dir)->orderBy('id', $dir);
        }

        AdminOrderFilters::apply($query, $request);

        $filename = 'orders-'.now()->format('Y-m-d').'.xlsx';

        return Excel::download(new OrdersExport($query), $filename);
    }
}
