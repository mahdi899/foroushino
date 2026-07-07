<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Certificate;
use App\Models\Seminar;
use App\Models\SeminarAsset;
use App\Models\SeminarAttendee;
use App\Models\User;
use App\Support\Mobile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SeminarAdminController extends Controller
{
    public function index(): JsonResponse
    {
        $seminars = Seminar::query()->withCount(['attendees', 'assets'])->orderByDesc('date')->get();

        return response()->json(['data' => $seminars->map(fn (Seminar $s) => $this->listPayload($s))]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'date' => ['required', 'date'],
            'location' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', 'string', 'max:50'],
        ]);

        $seminar = Seminar::create($data);

        return response()->json(['data' => $this->listPayload($seminar)], 201);
    }

    public function show(Seminar $seminar): JsonResponse
    {
        $seminar->load(['attendees.user', 'assets', 'certificates.user']);

        return response()->json(['data' => [
            ...$this->listPayload($seminar),
            'description' => $seminar->description,
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
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'date' => ['sometimes', 'date'],
            'location' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', 'string', 'max:50'],
        ]);

        $seminar->update($data);

        return response()->json(['data' => $this->listPayload($seminar)]);
    }

    /** Add an attendee by mobile — creates the student account if it doesn't exist yet. */
    public function addAttendee(Request $request, Seminar $seminar): JsonResponse
    {
        $data = $request->validate([
            'mobile' => ['required', 'string'],
            'name' => ['nullable', 'string', 'max:255'],
        ]);

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
            'file' => ['required', 'file', 'max:512000'],
        ]);

        $file = $request->file('file');
        $path = $file->store('seminar-assets/'.$seminar->id, 'local');

        $asset = $seminar->assets()->create([
            'title' => $data['title'],
            'type' => $data['type'],
            'path' => $path,
            'is_downloadable' => $data['is_downloadable'] ?? false,
        ]);

        return response()->json(['data' => ['id' => $asset->id, 'title' => $asset->title, 'type' => $asset->type]], 201);
    }

    public function deleteAsset(Seminar $seminar, SeminarAsset $asset): JsonResponse
    {
        abort_if($asset->seminar_id !== $seminar->id, 404);

        Storage::disk('local')->delete($asset->path);
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
    private function listPayload(Seminar $s): array
    {
        return [
            'id' => $s->id,
            'title' => $s->title,
            'slug' => $s->slug,
            'date' => $s->date?->toIso8601String(),
            'location' => $s->location,
            'status' => $s->status,
            'attendees_count' => $s->attendees_count ?? $s->attendees()->count(),
            'assets_count' => $s->assets_count ?? $s->assets()->count(),
        ];
    }
}
