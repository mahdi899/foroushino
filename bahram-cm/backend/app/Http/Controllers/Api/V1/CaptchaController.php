<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Concerns\VerifiesInternalSecret;
use App\Http\Controllers\Controller;
use App\Services\CaptchaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CaptchaController extends Controller
{
    use VerifiesInternalSecret;

    public function __construct(private readonly CaptchaService $captcha) {}

    public function math(): JsonResponse
    {
        return response()->json(['data' => $this->captcha->createMathChallenge()]);
    }

    public function storeMath(Request $request): JsonResponse
    {
        if (! $this->verifyInternalSecret($request)) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $validated = $request->validate([
            'id' => ['required', 'uuid'],
            'answer' => ['required', 'integer'],
        ]);

        $this->captcha->storeMathAnswer($validated['id'], (int) $validated['answer']);

        return response()->json(['data' => ['ok' => true]]);
    }

    public function config(): JsonResponse
    {
        return response()->json(['data' => $this->captcha->publicConfig()]);
    }
}
