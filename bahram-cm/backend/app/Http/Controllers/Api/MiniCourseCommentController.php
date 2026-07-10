<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMiniCourseCommentRequest;
use App\Models\MiniCourse;
use App\Models\MiniCourseComment;
use App\Services\ContentPublishService;
use App\Support\ApiResponse;

class MiniCourseCommentController extends Controller
{
    public function __construct(private readonly ContentPublishService $publish) {}

    public function store(StoreMiniCourseCommentRequest $request, string $slug)
    {
        $course = MiniCourse::query()
            ->active()
            ->where('slug', $slug)
            ->firstOrFail();

        if (! $course->comments_enabled) {
            return ApiResponse::error('comments_disabled', 'ثبت نظر برای این دوره غیرفعال است.', 403);
        }

        $comment = MiniCourseComment::create([
            'mini_course_id' => $course->id,
            'author_name' => $request->validated('author_name'),
            'author_email' => $request->validated('author_email'),
            'body' => $request->validated('body'),
            'status' => 'pending',
        ]);

        $this->publish->revalidateMiniCourses($course->slug);

        return ApiResponse::success([
            'id' => $comment->id,
            'status' => $comment->status,
            'message' => 'نظر شما ثبت شد و پس از تأیید نمایش داده می‌شود.',
        ], 201);
    }
}
