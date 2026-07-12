<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreContentCommentRequest;
use App\Models\ContentComment;
use App\Services\ContentCommentService;
use App\Support\ApiResponse;

class MiniCourseCommentController extends Controller
{
    public function __construct(private readonly ContentCommentService $comments) {}

    public function store(StoreContentCommentRequest $request, string $slug)
    {
        try {
            $user = $this->comments->resolveOptionalUser($request);
            $comment = $this->comments->create(
                ContentComment::TYPE_MINI_COURSE,
                $slug,
                $request->validated(),
                $user,
            );
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return ApiResponse::error('not_found', 'مینی‌دوره یافت نشد.', 404);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            if ($e->getStatusCode() === 403) {
                return ApiResponse::error('comments_disabled', 'ثبت نظر برای این دوره غیرفعال است.', 403);
            }
            throw $e;
        }

        return ApiResponse::success([
            'id' => $comment->id,
            'status' => $comment->status,
            'message' => 'نظر شما ثبت شد و پس از تأیید نمایش داده می‌شود.',
        ], 201);
    }
}
