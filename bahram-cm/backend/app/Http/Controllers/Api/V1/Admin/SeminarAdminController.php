<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Certificate;
use App\Models\Seminar;
use App\Models\SeminarAsset;
use App\Models\SeminarAttendee;
use App\Models\User;
use App\Services\SeminarProductService;
use App\Support\MediaUrl;
use App\Support\Mobile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SeminarAdminController extends Controller
{
    public function __construct(private SeminarProductService $seminarProducts) {}

    public function index(): JsonResponse
    {
        $seminars = Seminar::query()->with('product')->withCount(['attendees', 'assets'])->orderByDesc('date')->get();

        return response()->json(['data' => $seminars->map(fn (Seminar $s) => $this->listPayload($s))]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateSeminar($request);

        $seminar = Seminar::create($data);
        $seminar = $seminar->fresh();
        $this->seminarProducts->syncProduct($seminar);

        return response()->json(['data' => $this->listPayload($seminar->fresh(['product']))], 201);
    }

    public function show(Seminar $seminar): JsonResponse
    {
        $seminar->load(['product', 'attendees.user', 'assets', 'certificates.user']);

        return response()->json(['data' => [
            ...$this->listPayload($seminar),
            'description' => $seminar->description,
            'cover_image' => $seminar->cover_image,
            'cover_image_mobile' => $seminar->cover_image_mobile,
            'attendees' => $seminar->attendees->map(fn (SeminarAttendee $a) => [
                'id' => $a->id,
                'user_id' => $a->user_id,
                'name' => $a->user?->name,
                'mobile' => $a->user?->mobile,
                'attendance_status' => $a->attendance_status->value,
            ]),
            'assets' => $seminar->assets->map(fn (SeminarAsset $asset) => [
                'id' => $asset->id,
                'title' => $asset->title,
                'type' => $asset->type,
                'is_downloadable' => $asset->is_downloadable,
                'external_url' => $asset->external_url,
            ]),
            'certificates' => $seminar->certificates->map(fn (Certificate $c) => [
                'id' => $c->id,
                'user_name' => $c->user?->name,
                'certificate_number' => $c->certificate_number,
                'issued_at' => $c->issued_at?->toIso8601String(),
            ]),
        ]]);
    }

    public function update(Request $request, Seminar $seminar): JsonResponse
    {
        $data = $this->validateSeminar($request, partial: true);

        $seminar->update($data);
        $this->seminarProducts->syncProduct($seminar->fresh());

        return response()->json(['data' => $this->listPayload($seminar->fresh(['product']))]);
    }

    /** Add an attendee by mobile — creates the student account if it doesn't exist yet. */
    public function addAttendee(Request $request, Seminar $seminar): JsonResponse
    {
        $data = $request->validate([
            'mobile' => ['required', 'string'],
            'name' => ['nullable', 'string', 'max:255'],
        ]);

        abort_if($seminar->isFull(), 422, 'ظرفیت سمینار تکمیل شده است.');

        $mobile = Mobile::normalize($data['mobile']);
        abort_if(! $mobile, 422, 'شماره موبایل معتبر نیست.');

        $user = User::query()->firstOrCreate(
            ['mobile' => $mobile],
            ['name' => $data['name'] ?? 'دانشجو', 'status' => 'active']
        );

        $attendee = SeminarAttendee::query()->firstOrCreate(
            ['seminar_id' => $seminar->id, 'user_id' => $user->id],
            ['attendance_status' => 'registered']
        );

        return response()->json(['data' => ['id' => $attendee->id, 'user_id' => $user->id, 'name' => $user->name, 'mobile' => $user->mobile]], 201);
    }

    public function updateAttendee(Request $request, Seminar $seminar, SeminarAttendee $attendee): JsonResponse
    {
        abort_if($attendee->seminar_id !== $seminar->id, 404);

        $data = $request->validate(['attendance_status' => ['required', 'string', 'in:registered,attended,absent']]);
        $attendee->update($data);

        return response()->json(['data' => ['id' => $attendee->id, 'attendance_status' => $attendee->attendance_status->value]]);
    }

    public function uploadAsset(Request $request, Seminar $seminar): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'in:video,file'],
            'is_downloadable' => ['nullable', 'boolean'],
            'file' => ['nullable', 'required_without:external_url', 'file', 'max:512000'],
            'external_url' => ['nullable', 'required_without:file', 'url', 'max:2048'],
        ]);

        $externalUrl = isset($data['external_url']) ? trim($data['external_url']) : null;
        $path = null;

        if ($request->hasFile('file')) {
            $path = $request->file('file')->store('seminar-assets/'.$seminar->id, 'local');
            $externalUrl = null;
        }

        abort_if(! $path && ! $externalUrl, 422, 'فایل یا لینک ویدیو الزامی است.');

        $asset = $seminar->assets()->create([
            'title' => $data['title'],
            'type' => $externalUrl ? 'video' : $data['type'],
            'path' => $path,
            'external_url' => $externalUrl,
            'is_downloadable' => $externalUrl ? false : ($data['is_downloadable'] ?? false),
        ]);

        return response()->json(['data' => [
            'id' => $asset->id,
            'title' => $asset->title,
            'type' => $asset->type,
            'external_url' => $asset->external_url,
        ]], 201);
    }

    public function deleteAsset(Seminar $seminar, SeminarAsset $asset): JsonResponse
    {
        abort_if($asset->seminar_id !== $seminar->id, 404);

        if ($asset->path) {
            Storage::disk('local')->delete($asset->path);
        }
        $asset->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }

    /** Issues a certificate PDF file for an attendee (file uploaded by the admin — generation is out of scope). */
    public function issueCertificate(Request $request, Seminar $seminar): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'file' => ['required', 'file', 'mimes:pdf', 'max:20480'],
        ]);

        $number = 'CERT-'.$seminar->id.'-'.Str::upper(Str::random(6));
        $path = $request->file('file')->store('certificates/'.$seminar->id, 'local');

        $certificate = $seminar->certificates()->create([
            'user_id' => $data['user_id'],
            'certificate_number' => $number,
            'path' => $path,
            'issued_at' => now(),
        ]);

        return response()->json(['data' => [
            'id' => $certificate->id,
            'certificate_number' => $certificate->certificate_number,
            'issued_at' => $certificate->issued_at?->toIso8601String(),
        ]], 201);
    }

    /** @return array<string, mixed> */
    private function validateSeminar(Request $request, bool $partial = false): array
    {
        $rules = [
            'title' => [$partial ? 'sometimes' : 'required', 'string', 'max:255'],
            'date' => [$partial ? 'sometimes' : 'required', 'date'],
            'location' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'cover_image' => ['nullable', 'string', 'max:500'],
            'cover_image_mobile' => ['nullable', 'string', 'max:500'],
            'status' => ['nullable', 'string', 'in:draft,published'],
            'price' => ['nullable', 'integer', 'min:0'],
            'sale_price' => ['nullable', 'integer', 'min:0'],
            'capacity' => ['nullable', 'integer', 'min:1'],
            'banner_available' => ['nullable', 'string', 'max:500'],
            'banner_available_mobile' => ['nullable', 'string', 'max:500'],
            'banner_full' => ['nullable', 'string', 'max:500'],
            'banner_full_mobile' => ['nullable', 'string', 'max:500'],
            'promo_enabled' => ['nullable', 'boolean'],
        ];

        $data = $request->validate($rules);

        foreach (['banner_available', 'banner_available_mobile', 'banner_full', 'banner_full_mobile', 'cover_image', 'cover_image_mobile'] as $imageKey) {
            if (array_key_exists($imageKey, $data) && filled($data[$imageKey])) {
                $data[$imageKey] = MediaUrl::reference($data[$imageKey]) ?? $data[$imageKey];
            }
        }

        if (array_key_exists('sale_price', $data) && $data['sale_price'] === 0) {
            $data['sale_price'] = null;
        }

        return $data;
    }

    /** @return array<string, mixed> */
    private function listPayload(Seminar $s): array
    {
        $s->loadMissing('product');

        return [
            'id' => $s->id,
            'title' => $s->title,
            'slug' => $s->slug,
            'date' => $s->date?->toIso8601String(),
            'location' => $s->location,
            'status' => $s->status,
            'price' => $s->price,
            'sale_price' => $s->sale_price,
            'capacity' => $s->capacity,
            'banner_available' => $s->banner_available,
            'banner_available_mobile' => $s->banner_available_mobile,
            'banner_full' => $s->banner_full,
            'banner_full_mobile' => $s->banner_full_mobile,
            'cover_image' => $s->cover_image,
            'cover_image_mobile' => $s->cover_image_mobile,
            'promo_enabled' => (bool) $s->promo_enabled,
            'product_id' => $s->product_id,
            'product_slug' => $s->purchaseSlug(),
            'attendees_count' => $s->attendees_count ?? $s->registeredCount(),
            'remaining_seats' => $s->remainingSeats(),
            'is_full' => $s->isFull(),
            'assets_count' => $s->assets_count ?? $s->assets()->count(),
        ];
    }
}
