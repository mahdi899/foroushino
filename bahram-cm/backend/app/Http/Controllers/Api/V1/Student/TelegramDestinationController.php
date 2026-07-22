<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Modules\TelegramBot\Services\TelegramUserDestinationsService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TelegramDestinationController extends Controller
{
    public function __construct(
        private readonly TelegramUserDestinationsService $destinations,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return ApiResponse::success($this->destinations->panelPayloadForUser($request->user()));
    }
}
