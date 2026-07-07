<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\CourseAccessSource;
use App\Enums\CourseAccessStatus;
use App\Http\Controllers\Controller;
use App\Models\CourseAccess;
use App\Models\User;
use App\Support\Mobile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseAccessController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = CourseAccess::query()->with(['user', 'product'])->orderByDesc('id');

        if ($productId = $request->integer('product_id')) {
            $query->where('product_id', $productId);
        }

        $accesses = $query->paginate((int) $request->input('per_page', 50));

        return response()->json([
            'data' => $accesses->getCollection()->map(fn (CourseAccess $ca) => $this->payload($ca)),
            'meta' => ['current_page' => $accesses->currentPage(), 'last_page' => $accesses->lastPage(), 'total' => $accesses->total()],
        ]);
    }

    /** Manual grant — e.g. for offline/cash sales or goodwill access. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'mobile' => ['required', 'string'],
            'name' => ['nullable', 'string', 'max:255'],
            'product_id' => ['required', 'integer', 'exists:products,id'],
        ]);

        $mobile = Mobile::normalize($data['mobile']);
        abort_if(! $mobile, 422, 'شماره موبایل معتبر نیست.');

        $user = User::query()->firstOrCreate(
            ['mobile' => $mobile],
            ['name' => $data['name'] ?? 'دانشجو', 'status' => 'active']
        );

        $access = CourseAccess::query()->updateOrCreate(
            ['user_id' => $user->id, 'product_id' => $data['product_id']],
            ['status' => CourseAccessStatus::Active, 'access_type' => 'lifetime', 'source' => CourseAccessSource::Manual, 'activated_at' => now(), 'deactivated_at' => null]
        );

        $access->load(['user', 'product']);

        return response()->json(['data' => $this->payload($access)], 201);
    }

    public function update(Request $request, CourseAccess $courseAccess): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string', 'in:active,inactive,revoked'],
        ]);

        $courseAccess->update([
            'status' => $data['status'],
            'deactivated_at' => $data['status'] === 'active' ? null : now(),
        ]);
        $courseAccess->load(['user', 'product']);

        return response()->json(['data' => $this->payload($courseAccess)]);
    }

    /** @return array<string, mixed> */
    private function payload(CourseAccess $ca): array
    {
        return [
            'id' => $ca->id,
            'user_id' => $ca->user_id,
            'user_name' => $ca->user?->name,
            'user_mobile' => $ca->user?->mobile,
            'product_title' => $ca->product?->title,
            'status' => $ca->status->value,
            'source' => $ca->source->value,
            'activated_at' => $ca->activated_at?->toIso8601String(),
        ];
    }
}
