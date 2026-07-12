<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\SatApplicationStatus;
use App\Events\SatApplicationAccepted;
use App\Http\Controllers\Controller;
use App\Models\SatApplication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SatApplicationAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = SatApplication::query()->with('user')->orderByDesc('id');

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        $applications = $query->paginate((int) $request->input('per_page', 50));

        return response()->json([
            'data' => $applications->getCollection()->map(fn (SatApplication $a) => $this->payload($a)),
            'meta' => ['current_page' => $applications->currentPage(), 'last_page' => $applications->lastPage(), 'total' => $applications->total()],
        ]);
    }

    public function update(Request $request, SatApplication $satApplication): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string', 'in:received,reviewing,accepted,rejected'],
            'admin_note' => ['nullable', 'string', 'max:1000'],
        ]);

        $previous = $satApplication->status;

        $satApplication->update([
            'status' => $data['status'],
            'admin_note' => $data['admin_note'] ?? $satApplication->admin_note,
            'reviewed_at' => now(),
        ]);

        $becameAccepted = $previous !== SatApplicationStatus::Accepted
            && $satApplication->status === SatApplicationStatus::Accepted;

        if ($becameAccepted && $satApplication->user) {
            SatApplicationAccepted::dispatch($satApplication->user, $satApplication);
        }

        return response()->json(['data' => $this->payload($satApplication)]);
    }

    /** @return array<string, mixed> */
    private function payload(SatApplication $a): array
    {
        return [
            'id' => $a->id,
            'name' => $a->name,
            'mobile' => $a->mobile,
            'city' => $a->city,
            'age' => $a->age,
            'status' => $a->status->value,
            'admin_note' => $a->admin_note,
            'submitted_at' => $a->submitted_at?->toIso8601String(),
            'reviewed_at' => $a->reviewed_at?->toIso8601String(),
            'synced_to_sat_at' => $a->synced_to_sat_at?->toIso8601String(),
            'sat_sync_error' => $a->sat_sync_error,
        ];
    }
}
