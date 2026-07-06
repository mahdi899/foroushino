<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\ArticleRevisionResource;
use App\Models\Article;
use App\Models\ArticleRevision;
use App\Services\ArticleRevisionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ArticleRevisionController extends Controller
{
    public function __construct(private ArticleRevisionService $revisions)
    {
    }

    public function index(Article $article): JsonResponse
    {
        $this->assertDraft($article);

        $items = $this->revisions->listForArticle($article);

        return response()->json([
            'data' => $items
                ->map(fn (ArticleRevision $revision) => (new ArticleRevisionResource($revision))->resolve())
                ->values()
                ->all(),
        ]);
    }

    public function store(Request $request, Article $article): JsonResponse
    {
        $this->assertDraft($article);

        $validated = $request->validate([
            'snapshot' => ['required', 'array'],
            'label' => ['nullable', 'string', 'max:255'],
            'force' => ['sometimes', 'boolean'],
        ]);

        $label = filled($validated['label'] ?? null)
            ? $validated['label']
            : 'نسخه — '.now()->format('H:i');

        $result = $this->revisions->create(
            $article,
            $validated['snapshot'],
            $label,
            (bool) ($validated['force'] ?? false),
            $request->user(),
        );

        if ($result['skipped']) {
            return response()->json([
                'data' => null,
                'message' => $result['message'],
            ]);
        }

        return response()->json([
            'data' => (new ArticleRevisionResource($result['revision'], includeSnapshot: true))->resolve(),
        ], 201);
    }

    public function show(Article $article, ArticleRevision $revision): JsonResponse
    {
        $this->assertDraft($article);
        $this->assertBelongsToArticle($article, $revision);

        $revision->loadMissing('author:id,name');

        return response()->json([
            'data' => (new ArticleRevisionResource($revision, includeSnapshot: true))->resolve(),
        ]);
    }

    public function destroy(Article $article, ArticleRevision $revision): JsonResponse
    {
        $this->assertDraft($article);
        $this->assertBelongsToArticle($article, $revision);

        $revision->delete();

        return response()->json(null, 204);
    }

    private function assertDraft(Article $article): void
    {
        abort_if($article->status !== 'draft', 422, 'نسخه‌بندی فقط برای پیش‌نویس فعال است.');
    }

    private function assertBelongsToArticle(Article $article, ArticleRevision $revision): void
    {
        abort_if($revision->article_id !== $article->id, 404);
    }
}
