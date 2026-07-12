<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ContentComment;
use App\Services\ContentPublishService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ContentCommentAdminController extends Controller
{
    public function __construct(private readonly ContentPublishService $publish) {}

    public function index(Request $request): JsonResponse
    {
        $query = ContentComment::query()
            ->topLevel()
            ->with(['replies' => fn ($q) => $q->orderBy('id'), 'user.profile'])
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('content_type')) {
            $query->where('content_type', $request->string('content_type'));
        }

        if ($request->filled('content_slug')) {
            $query->where('content_slug', $request->string('content_slug'));
        }

        if ($request->filled('q')) {
            $term = '%'.$request->string('q').'%';
            $query->where(function ($q) use ($term) {
                $q->where('author_name', 'like', $term)
                    ->orWhere('body', 'like', $term)
                    ->orWhere('content_slug', 'like', $term);
            });
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

    public function update(Request $request, ContentComment $contentComment): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['sometimes', 'string', Rule::in(['pending', 'approved', 'rejected'])],
            'body' => ['sometimes', 'string', 'min:1', 'max:2000'],
        ]);

        $contentComment->update($validated);
        $this->publish->revalidateContentComments($contentComment->content_type, $contentComment->content_slug);

        return response()->json(['data' => $this->payload($contentComment->fresh(['replies', 'user.profile']))]);
    }

    public function destroy(ContentComment $contentComment): JsonResponse
    {
        $type = $contentComment->content_type;
        $slug = $contentComment->content_slug;
        $contentComment->delete();
        $this->publish->revalidateContentComments($type, $slug);

        return response()->json(null, 204);
    }

    /** @return array<string, mixed> */
    private function payload(ContentComment $item): array
    {
        return [
            'id' => $item->id,
            'content_type' => $item->content_type,
            'content_slug' => $item->content_slug,
            'user_id' => $item->user_id,
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
