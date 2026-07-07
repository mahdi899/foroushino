<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\Seminar;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

class SeminarController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $seminars = Seminar::query()
            ->whereHas('attendees', fn ($q) => $q->where('user_id', $user->id))
            ->with(['attendees' => fn ($q) => $q->where('user_id', $user->id)])
            ->orderByDesc('date')
            ->get();

        return ApiResponse::success($seminars->map(fn (Seminar $seminar) => [
            'id' => $seminar->id,
            'slug' => $seminar->slug,
            'title' => $seminar->title,
            'date' => $seminar->date?->toIso8601String(),
            'location' => $seminar->location,
            'attendance_status' => $seminar->attendees->first()?->attendance_status->value,
        ]));
    }

    public function show(Request $request, Seminar $seminar): JsonResponse
    {
        $user = $request->user();
        $attendee = $seminar->attendees()->where('user_id', $user->id)->first();

        if (! $attendee) {
            return ApiResponse::error('not_found', 'این سمینار برای شما ثبت نشده است.', 404);
        }

        $seminar->load(['assets', 'certificates' => fn ($q) => $q->where('user_id', $user->id)]);

        return ApiResponse::success([
            'id' => $seminar->id,
            'title' => $seminar->title,
            'date' => $seminar->date?->toIso8601String(),
            'location' => $seminar->location,
            'description' => $seminar->description,
            'attendance_status' => $attendee->attendance_status->value,
            'assets' => $seminar->assets->map(fn ($asset) => [
                'id' => $asset->id,
                'title' => $asset->title,
                'type' => $asset->type,
                // Never expose the raw storage path — only a short-lived signed URL.
                'download_url' => URL::temporarySignedRoute(
                    'student.seminar-assets.download',
                    now()->addMinutes(10),
                    ['asset' => $asset->id]
                ),
            ]),
            'certificates' => $seminar->certificates->map(fn ($cert) => [
                'id' => $cert->id,
                'certificate_number' => $cert->certificate_number,
                'issued_at' => $cert->issued_at?->toIso8601String(),
                'download_url' => $cert->path ? URL::temporarySignedRoute(
                    'student.certificates.download',
                    now()->addMinutes(10),
                    ['certificate' => $cert->id]
                ) : null,
            ]),
        ]);
    }
}
