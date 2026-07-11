<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\IdentityVerificationArtifact;
use App\Services\AdminAuditLogger;
use App\Services\Identity\IdentityArtifactStorage;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class IdentityArtifactController extends Controller
{
    public function stream(
        Request $request,
        IdentityVerificationArtifact $artifact,
        IdentityArtifactStorage $storage,
        AdminAuditLogger $audit,
    ): StreamedResponse {
        abort_unless($request->user()->hasPermission('identity.view_sensitive_documents'), 403);

        $artifact->loadMissing('submission');

        $audit->log($request->user(), 'identity.artifact_viewed', $artifact, [
            'artifact_id' => $artifact->id,
            'submission_id' => $artifact->submission_id,
            'type' => $artifact->type->value,
            'user_id' => $artifact->submission?->user_id,
        ]);

        return $storage->stream($artifact);
    }
}
