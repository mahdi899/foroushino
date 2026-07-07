<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ArticleDetailResource;
use App\Http\Resources\ArticleListResource;
use App\Models\Article;
use App\Support\ApiResponse;
use App\Support\ArticleSlug;
use App\Support\RuntimeCache;
use Illuminate\Http\Request;

class ArticleController extends Controller
{
    /**
     * List published articles, newest first.
     */
    public function index(Request $request)
    {
        $page = max(1, (int) $request->integer('page', 1));
        $perPage = min((int) $request->integer('per_page', 12), 50) ?: 12;
        $cacheKey = 'public_articles:index:'.$page.':'.$perPage;

        return RuntimeCache::remember($cacheKey, 300, function () use ($request, $perPage) {
            $articles = Article::query()
                ->published()
                ->orderByDesc('published_at')
                ->paginate($perPage, ['*'], 'page', max(1, (int) $request->integer('page', 1)));

            return ArticleListResource::collection($articles);
        });
    }

    /**
     * Show a single published article by slug.
     */
    public function show(string $slug)
    {
        $normalized = ArticleSlug::normalize($slug);
        $cacheKey = 'public_articles:show:'.$normalized;

        return RuntimeCache::remember($cacheKey, 300, function () use ($slug) {
            $article = Article::query()
                ->published()
                ->whereIn('slug', ArticleSlug::lookupCandidates($slug))
                ->first();

            if (! $article) {
                return ApiResponse::error('article_not_found', 'مقاله مورد نظر یافت نشد.', 404);
            }

            return ArticleDetailResource::make($article);
        });
    }
}
