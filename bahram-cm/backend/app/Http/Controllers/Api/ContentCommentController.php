<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreContentCommentRequest;
use App\Http\Resources\ContentCommentResource;
use App\Models\ContentComment;
use App\Services\ContentCommentService;
use App\Support\ApiResponse;
use App\Support\RuntimeCache;

class ContentCommentController extends Controller
{
    public function __construct(private readonly ContentCommentService $comments) {}

    public function index(string $type, string $slug)
    {
        abort_unless(in_array($type, ContentComment::TYPES, true), 404);

        $cacheKey = "public_content_comments:{$type}:{$slug}";

        return RuntimeCache::remember($cacheKey, 600, function () use ($type, $slug) {
            if ($type === ContentComment::TYPE_MINI_COURSE) {
                $course = \App\Models\MiniCourse::query()->active()->where('slug', $slug)->first();
                if (! $course || ! $course->comments_enabled) {
                    return ContentCommentResource::collection(collect());
                }
            }

            $items = $this->comments->approvedFor($type, $slug);

            return ContentCommentResource::collection($items);
        }, 'content-comments');
    }

    public function store(StoreContentCommentRequest $request, string $type, string $slug)
    {
        abort_unless(in_array($type, ContentComment::TYPES, true), 404);

        try {
            $user = $this->comments->resolveOptionalUser($request);
            $comment = $this->comments->create($type, $slug, $request->validated(), $user);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return ApiResponse::error('not_found', 'محتوا یافت نشد.', 404);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            if ($e->getStatusCode() === 403) {
                return ApiResponse::error('comments_disabled', 'ثبت نظر برای این محتوا غیرفعال است.', 403);
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
