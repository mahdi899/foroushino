<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\MediaUrl;
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

        $perPage = min(max((int) $request->input('per_page', 20), 1), 20);

        $students = $query->with('profile')->orderByDesc('id')->paginate($perPage);

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

        $student->load([
            'profile',
            'courseAccesses.product',
            'orders' => fn ($q) => $q->with('product')->latest(),
            'tickets' => fn ($q) => $q->latest(),
            'satApplications',
        ]);

        $orders = $student->orders;
        $paidStatuses = ['paid', 'fulfilled'];

        return response()->json(['data' => [
            ...$this->listPayload($student),
            'mobile_verified_at' => $student->mobile_verified_at?->toIso8601String(),
            'display_name' => $this->displayName($student),
            'profile' => $this->profilePayload($student),
            'stats' => [
                'orders_total' => $orders->count(),
                'orders_paid' => $orders->whereIn('status', $paidStatuses)->count(),
                'orders_unpaid' => $orders->whereNotIn('status', $paidStatuses)->count(),
                'course_accesses' => $student->courseAccesses->count(),
                'tickets' => $student->tickets->count(),
            ],
            'course_accesses' => $student->courseAccesses->map(fn ($ca) => [
                'id' => $ca->id,
                'product_id' => $ca->product_id,
                'product_title' => $ca->product?->title,
                'status' => $ca->status->value,
                'access_type' => $ca->access_type,
                'source' => $ca->source?->value,
                'activated_at' => $ca->activated_at?->toIso8601String(),
            ]),
            'orders' => $orders->map(fn ($o) => [
                'id' => $o->id,
                'order_number' => $o->order_number,
                'product_title' => $o->product?->title,
                'amount' => $o->amount,
                'discount_amount' => $o->discount_amount,
                'final_amount' => $o->final_amount,
                'status' => $o->status,
                'payment_status' => $o->payment_status,
                'created_at' => $o->created_at?->toIso8601String(),
                'paid_at' => $o->paid_at?->toIso8601String(),
            ]),
            'tickets' => $student->tickets->map(fn ($t) => [
                'id' => $t->id,
                'subject' => $t->subject,
                'department' => $t->department,
                'status' => $t->status->value,
                'created_at' => $t->created_at?->toIso8601String(),
                'updated_at' => $t->updated_at?->toIso8601String(),
            ]),
            'tickets_count' => $student->tickets->count(),
            'sat_applications' => $student->satApplications->map(fn ($sa) => [
                'id' => $sa->id,
                'status' => $sa->status->value,
                'created_at' => $sa->created_at?->toIso8601String(),
            ]),
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
        $profile = $u->relationLoaded('profile') ? $u->profile : null;
        $firstName = $profile?->first_name;
        $lastName = $profile?->last_name;
        $displayName = trim(implode(' ', array_filter([$firstName, $lastName])));

        return [
            'id' => $u->id,
            'name' => $u->name,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'display_name' => $displayName !== '' ? $displayName : $u->name,
            'avatar_url' => $profile?->avatar ? MediaUrl::resolve($profile->avatar) : null,
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

    private function displayName(User $student): string
    {
        $profile = $student->profile;
        if ($profile) {
            $full = trim(implode(' ', array_filter([$profile->first_name, $profile->last_name])));
            if ($full !== '') {
                return $full;
            }
        }

        return (string) ($student->name ?: 'دانشجو');
    }

    /** @return array<string, mixed>|null */
    private function profilePayload(User $student): ?array
    {
        $profile = $student->profile;
        if (! $profile) {
            return null;
        }

        return [
            'first_name' => $profile->first_name,
            'last_name' => $profile->last_name,
            'email' => $profile->email,
            'city' => $profile->city,
            'age' => $profile->age,
            'current_job' => $profile->current_job,
            'instagram' => $profile->instagram,
            'telegram' => $profile->telegram,
            'experience_level' => $profile->experience_level,
            'income_goal' => $profile->income_goal,
            'avatar' => $profile->avatar,
            'avatar_url' => $profile->avatar ? MediaUrl::resolve($profile->avatar) : null,
            'updated_at' => $profile->updated_at?->toIso8601String(),
        ];
    }
}
