<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\MiniCourse;
use App\Models\MiniCourseComment;
use App\Services\ContentPublishService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MiniCourseCommentController extends Controller
{
    public function __construct(private readonly ContentPublishService $publish) {}

    public function index(Request $request, MiniCourse $miniCourse): JsonResponse
    {
        $query = MiniCourseComment::query()
            ->where('mini_course_id', $miniCourse->id)
            ->topLevel()
            ->with(['replies' => fn ($q) => $q->orderBy('id')])
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $items = $query->paginate((int) $request->input('per_page', 50));

        return response()->json([
            'data' => $items->getCollection()->map(fn (MiniCourseComment $c) => $this->payload($c)),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    public function update(Request $request, MiniCourse $miniCourse, MiniCourseComment $comment): JsonResponse
    {
        abort_unless($comment->mini_course_id === $miniCourse->id, 404);

        $validated = $request->validate([
            'status' => ['sometimes', 'string', Rule::in(['pending', 'approved', 'rejected'])],
            'body' => ['sometimes', 'string', 'min:1', 'max:2000'],
        ]);

        $comment->update($validated);
        $this->publish->revalidateMiniCourses($miniCourse->slug);

        return response()->json(['data' => $this->payload($comment->fresh('replies'))]);
    }

    public function destroy(MiniCourse $miniCourse, MiniCourseComment $comment): JsonResponse
    {
        abort_unless($comment->mini_course_id === $miniCourse->id, 404);

        $comment->delete();
        $this->publish->revalidateMiniCourses($miniCourse->slug);

        return response()->json(null, 204);
    }

    /** @return array<string, mixed> */
    private function payload(MiniCourseComment $item): array
    {
        return [
            'id' => $item->id,
            'mini_course_id' => $item->mini_course_id,
            'author_name' => $item->author_name,
            'author_email' => $item->author_email,
            'body' => $item->body,
            'status' => $item->status,
            'parent_id' => $item->parent_id,
            'created_at' => $item->created_at?->toIso8601String(),
            'replies' => $item->relationLoaded('replies')
                ? $item->replies->map(fn (MiniCourseComment $r) => $this->payload($r))->values()
                : [],
        ];
    }
}
