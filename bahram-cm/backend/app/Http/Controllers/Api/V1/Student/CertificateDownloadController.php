<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\Certificate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/** Reachable only via a short-lived signed URL (see SeminarController::show). */
class CertificateDownloadController extends Controller
{
    public function __invoke(Request $request, Certificate $certificate)
    {
        abort_unless($request->hasValidSignature(), 403);
        abort_unless($certificate->path, 404);

        $disk = Storage::disk('local');
        abort_unless($disk->exists($certificate->path), 404);

        return $disk->download($certificate->path, 'certificate-'.($certificate->certificate_number ?: $certificate->id).'.pdf');
    }
}
