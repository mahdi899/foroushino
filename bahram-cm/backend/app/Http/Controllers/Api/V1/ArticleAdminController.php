<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\ArticleAdminResource;
use App\Models\Article;
use App\Services\ArticleRevisionService;
use App\Support\ArticleSlug;
use App\Support\MediaUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ArticleAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Article::query()->orderByDesc('updated_at');

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $this->normalizeStatus($status));
        }

        $articles = $query->paginate((int) $request->input('per_page', 50));

        return response()->json([
            'data' => ArticleAdminResource::collection($articles->getCollection())->resolve(),
            'meta' => [
                'current_page' => $articles->currentPage(),
                'last_page' => $articles->lastPage(),
                'per_page' => $articles->perPage(),
                'total' => $articles->total(),
            ],
        ]);
    }

    public function show(Article $article): JsonResponse
    {
        return response()->json(['data' => new ArticleAdminResource($article)]);
    }

    public function trashIndex(Request $request): JsonResponse
    {
        $cutoff = now()->subHours(Article::TRASH_RETENTION_HOURS);

        $articles = Article::onlyTrashed()
            ->where('deleted_at', '>', $cutoff)
            ->orderByDesc('deleted_at')
            ->paginate((int) $request->input('per_page', 50));

        return response()->json([
            'data' => ArticleAdminResource::collection($articles->getCollection())->resolve(),
            'meta' => [
                'current_page' => $articles->currentPage(),
                'last_page' => $articles->lastPage(),
                'per_page' => $articles->perPage(),
                'total' => $articles->total(),
            ],
        ]);
    }

    public function showBySlug(string $slug): JsonResponse
    {
        $article = Article::query()->where('slug', $slug)->firstOrFail();

        return response()->json(['data' => new ArticleAdminResource($article)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request);
        $article = Article::create($data);

        return response()->json(['data' => new ArticleAdminResource($article->fresh())], 201);
    }

    public function update(Request $request, Article $article): JsonResponse
    {
        $data = $this->validatePayload($request, $article);
        $wasDraft = $article->status === 'draft';
        $article->update($data);

        if ($wasDraft && $article->fresh()->status === 'published') {
            app(ArticleRevisionService::class)->purgeForArticle($article);
        }

        return response()->json(['data' => new ArticleAdminResource($article->fresh())]);
    }

    public function destroy(Article $article): JsonResponse
    {
        $article->delete();

        return response()->json([
            'data' => [
                'id' => $article->id,
                'deleted_at' => $article->deleted_at?->toIso8601String(),
                'purge_at' => $article->deleted_at
                    ? $article->deleted_at->copy()->addHours(Article::TRASH_RETENTION_HOURS)->toIso8601String()
                    : null,
            ],
            'message' => 'مقاله به سطل زباله منتقل شد.',
        ]);
    }

    public function restore(int $id): JsonResponse
    {
        $article = Article::onlyTrashed()->findOrFail($id);
        $article->restore();

        return response()->json(['data' => new ArticleAdminResource($article->fresh())]);
    }

    /** @return array<string, mixed> */
    private function validatePayload(Request $request, ?Article $article = null): array
    {
        $validated = $request->validate([
            'title' => [$article ? 'sometimes' : 'required', 'string', 'max:255'],
            'slug' => [
                $article ? 'sometimes' : 'nullable',
                'string',
                'max:255',
                Rule::unique('articles', 'slug')->ignore($article?->id),
            ],
            'excerpt' => ['sometimes', 'nullable', 'string'],
            'body' => ['sometimes', 'nullable', 'string'],
            'cover_url' => ['sometimes', 'nullable', 'string', 'max:500'],
            'reading_time' => ['sometimes', 'nullable', 'string', 'max:50'],
            'kicker' => ['sometimes', 'nullable', 'string', 'max:100'],
            'status' => ['sometimes', 'string', Rule::in(['active', 'draft', 'published'])],
            'published_at' => ['sometimes', 'nullable', 'date'],
            'seo' => ['sometimes', 'nullable', 'array'],
            'seo.title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'seo.description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'seo.canonical' => ['sometimes', 'nullable', 'string', 'max:500'],
            'seo.robots' => ['sometimes', 'nullable', 'string', 'max:100'],
        ]);

        $data = [];

        if (array_key_exists('title', $validated)) {
            $data['title'] = $validated['title'];
        }

        if (array_key_exists('slug', $validated)) {
            $data['slug'] = ArticleSlug::normalize(
                $validated['slug'] ?? null,
                $validated['title'] ?? $article?->title,
            );
        }

        if (array_key_exists('excerpt', $validated)) {
            $data['excerpt'] = $validated['excerpt'];
        }

        if (array_key_exists('body', $validated)) {
            $data['content'] = $validated['body'];
        }

        if (array_key_exists('cover_url', $validated)) {
            $data['featured_image'] = $this->normalizeCoverPath($validated['cover_url']);
        }

        if (array_key_exists('reading_time', $validated)) {
            $data['reading_time'] = $validated['reading_time'];
        }

        if (array_key_exists('kicker', $validated)) {
            $data['kicker'] = $validated['kicker'];
        }

        if (array_key_exists('status', $validated)) {
            $data['status'] = $this->normalizeStatus($validated['status']);
            if ($data['status'] === 'published' && ! $article?->published_at && ! array_key_exists('published_at', $validated)) {
                $data['published_at'] = now();
            }
        }

        if (array_key_exists('published_at', $validated)) {
            $data['published_at'] = $validated['published_at'];
        }

        if (! empty($validated['seo']) && is_array($validated['seo'])) {
            $seo = $validated['seo'];
            if (array_key_exists('title', $seo)) {
                $data['meta_title'] = $seo['title'];
            }
            if (array_key_exists('description', $seo)) {
                $data['meta_description'] = $seo['description'];
            }
            if (array_key_exists('canonical', $seo)) {
                $data['canonical_url'] = $seo['canonical'];
            }
            if (array_key_exists('robots', $seo)) {
                $data['is_indexable'] = ! str_contains(strtolower((string) $seo['robots']), 'noindex');
            }
        }

        if ($article === null && ! isset($data['author_id'])) {
            $data['author_id'] = $request->user()?->id;
        }

        return $data;
    }

    private function normalizeStatus(string $status): string
    {
        return in_array($status, ['active', 'published'], true) ? 'published' : 'draft';
    }

    private function normalizeCoverPath(?string $url): ?string
    {
        if (! filled($url)) {
            return null;
        }

        $ref = MediaUrl::reference($url);
        if (! $ref) {
            return null;
        }

        if (str_starts_with($ref, '/storage/')) {
            return ltrim(substr($ref, strlen('/storage/')), '/');
        }

        return $ref;
    }
}
