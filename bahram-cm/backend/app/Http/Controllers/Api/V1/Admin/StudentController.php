<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Mobile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::query()->where('is_admin', false)->withCount(['orders', 'courseAccesses', 'tickets']);

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('mobile', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        $students = $query->orderByDesc('id')->paginate((int) $request->input('per_page', 50));

        return response()->json([
            'data' => $students->getCollection()->map(fn (User $u) => $this->listPayload($u)),
            'meta' => [
                'current_page' => $students->currentPage(),
                'last_page' => $students->lastPage(),
                'total' => $students->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'mobile' => ['required', 'string'],
            'email' => ['nullable', 'email', 'max:255', 'unique:users,email'],
            'status' => ['sometimes', 'string', 'in:active,suspended,blocked'],
        ]);

        $mobile = Mobile::normalize($data['mobile']);
        abort_if(! $mobile, 422, 'شماره موبایل معتبر نیست.');

        abort_if(
            User::query()->where('mobile', $mobile)->exists(),
            422,
            'این شماره موبایل قبلاً ثبت شده است.'
        );

        $student = User::query()->create([
            'name' => $data['name'],
            'mobile' => $mobile,
            'email' => $data['email'] ?? null,
            'status' => $data['status'] ?? 'active',
            'is_admin' => false,
        ]);

        return response()->json(['data' => $this->listPayload($student)], 201);
    }

    public function show(User $student): JsonResponse
    {
        abort_if($student->is_admin, 404);

        $student->load(['profile', 'courseAccesses.product', 'orders' => fn ($q) => $q->latest()->limit(10), 'tickets', 'satApplications']);

        return response()->json(['data' => [
            ...$this->listPayload($student),
            'profile' => $student->profile,
            'course_accesses' => $student->courseAccesses->map(fn ($ca) => [
                'id' => $ca->id,
                'product_title' => $ca->product?->title,
                'status' => $ca->status->value,
                'activated_at' => $ca->activated_at?->toIso8601String(),
            ]),
            'orders' => $student->orders->map(fn ($o) => [
                'id' => $o->id,
                'order_number' => $o->order_number,
                'final_amount' => $o->final_amount,
                'status' => $o->status,
            ]),
            'tickets_count' => $student->tickets->count(),
            'sat_applications' => $student->satApplications->map(fn ($sa) => ['id' => $sa->id, 'status' => $sa->status->value]),
        ]]);
    }

    public function update(Request $request, User $student): JsonResponse
    {
        abort_if($student->is_admin, 404);

        $data = $request->validate([
            'status' => ['sometimes', 'string', 'in:active,suspended,blocked'],
            'name' => ['sometimes', 'string', 'max:255'],
        ]);

        $student->update($data);

        return response()->json(['data' => $this->listPayload($student)]);
    }

    /** @return array<string, mixed> */
    private function listPayload(User $u): array
    {
        return [
            'id' => $u->id,
            'name' => $u->name,
            'mobile' => $u->mobile,
            'email' => $u->email,
            'status' => $u->status->value,
            'orders_count' => $u->orders_count ?? null,
            'course_accesses_count' => $u->course_accesses_count ?? null,
            'tickets_count' => $u->tickets_count ?? null,
            'first_login_at' => $u->first_login_at?->toIso8601String(),
            'last_login_at' => $u->last_login_at?->toIso8601String(),
            'created_at' => $u->created_at?->toIso8601String(),
        ];
    }
}
