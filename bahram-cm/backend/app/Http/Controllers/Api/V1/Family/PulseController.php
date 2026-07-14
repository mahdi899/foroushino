<?php

namespace App\Http\Controllers\Api\V1\Family;

use App\Enums\Family\FamilyCommentStatus;
use App\Http\Controllers\Controller;
use App\Models\FamilyComment;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class PulseController extends Controller
{
    public function index(): JsonResponse
    {
        $items = FamilyComment::query()
            ->where('status', FamilyCommentStatus::Approved->value)
            ->whereNotNull('family_pulse_at')
            ->with('user:id,name')
            ->orderByDesc('family_pulse_at')
            ->limit(12)
            ->get()
            ->map(fn (FamilyComment $c) => [
                'id' => $c->id,
                'body' => $c->body,
                'name' => $c->user?->name ?? 'عضو خانواده',
                'at' => $c->family_pulse_at?->toIso8601String(),
            ]);

        return ApiResponse::success($items);
    }
}
