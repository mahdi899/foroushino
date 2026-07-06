<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ArticleDetailResource;
use App\Http\Resources\ArticleListResource;
use App\Models\Article;
use App\Support\ApiResponse;
use App\Support\ArticleSlug;
use Illuminate\Http\Request;

class ArticleController extends Controller
{
    /**
     * List published articles, newest first.
     */
    public function index(Request $request)
    {
        $perPage = min((int) $request->integer('per_page', 12), 50) ?: 12;

        $articles = Article::query()
            ->published()
            ->orderByDesc('published_at')
            ->paginate($perPage);

        return ArticleListResource::collection($articles);
    }

    /**
     * Show a single published article by slug.
     */
    public function show(string $slug)
    {
        $article = Article::query()
            ->published()
            ->whereIn('slug', ArticleSlug::lookupCandidates($slug))
            ->first();

        if (! $article) {
            return ApiResponse::error('article_not_found', 'مقاله مورد نظر یافت نشد.', 404);
        }

        return ArticleDetailResource::make($article);
    }
}
