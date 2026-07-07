<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Services\StudentImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ImportAdminController extends Controller
{
    public function __construct(private readonly StudentImportService $importer)
    {
    }

    /** Dry-run preview — validates rows, writes nothing. */
    public function preview(Request $request): JsonResponse
    {
        $request->validate(['file' => ['required', 'file', 'mimes:csv,txt', 'max:5120']]);

        return response()->json(['data' => $this->importer->preview($request->file('file'))]);
    }

    /** Commits a previously previewed file — creates/updates students and grants access. */
    public function commit(Request $request): JsonResponse
    {
        $request->validate(['file' => ['required', 'file', 'mimes:csv,txt', 'max:5120']]);

        return response()->json(['data' => $this->importer->commit($request->file('file'))]);
    }
}
