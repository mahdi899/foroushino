<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ContentComment;
use App\Models\MiniCourse;
use App\Services\ContentPublishService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MiniCourseCommentController extends Controller
{
    public function __construct(private readonly ContentPublishService $publish) {}

    public function index(Request $request, MiniCourse $miniCourse): JsonResponse
    {
        $query = ContentComment::query()
            ->forContent(ContentComment::TYPE_MINI_COURSE, $miniCourse->slug)
            ->topLevel()
            ->with(['replies' => fn ($q) => $q->orderBy('id')])
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $items = $query->paginate((int) $request->input('per_page', 50));

        return response()->json([
            'data' => $items->getCollection()->map(fn (ContentComment $c) => $this->payload($c)),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    public function update(Request $request, MiniCourse $miniCourse, ContentComment $contentComment): JsonResponse
    {
        abort_unless(
            $contentComment->content_type === ContentComment::TYPE_MINI_COURSE
            && $contentComment->content_slug === $miniCourse->slug,
            404,
        );

        $validated = $request->validate([
            'status' => ['sometimes', 'string', Rule::in(['pending', 'approved', 'rejected'])],
            'body' => ['sometimes', 'string', 'min:1', 'max:2000'],
        ]);

        $contentComment->update($validated);
        $this->publish->revalidateContentComments(ContentComment::TYPE_MINI_COURSE, $miniCourse->slug);

        return response()->json(['data' => $this->payload($contentComment->fresh('replies'))]);
    }

    public function destroy(MiniCourse $miniCourse, ContentComment $contentComment): JsonResponse
    {
        abort_unless(
            $contentComment->content_type === ContentComment::TYPE_MINI_COURSE
            && $contentComment->content_slug === $miniCourse->slug,
            404,
        );

        $contentComment->delete();
        $this->publish->revalidateContentComments(ContentComment::TYPE_MINI_COURSE, $miniCourse->slug);

        return response()->json(null, 204);
    }

    /** @return array<string, mixed> */
    private function payload(ContentComment $item): array
    {
        return [
            'id' => $item->id,
            'mini_course_id' => null,
            'author_name' => $item->author_name,
            'author_email' => $item->author_email,
            'author_avatar_url' => $item->author_avatar_url,
            'body' => $item->body,
            'status' => $item->status,
            'parent_id' => $item->parent_id,
            'created_at' => $item->created_at?->toIso8601String(),
            'replies' => $item->relationLoaded('replies')
                ? $item->replies->map(fn (ContentComment $r) => $this->payload($r))->values()
                : [],
        ];
    }
}
