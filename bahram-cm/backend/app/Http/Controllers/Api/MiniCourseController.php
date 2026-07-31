<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ContentCommentResource;
use App\Models\ContentComment;
use App\Models\MiniCourse;
use App\Support\HttpCache;
use App\Support\RuntimeCache;

class MiniCourseController extends Controller
{
    public function index()
    {
        $cacheKey = 'public_mini_courses:index';

        return HttpCache::withPublicCache(
            RuntimeCache::remember($cacheKey, 3600, function () {
            $items = MiniCourse::query()
                ->active()
                ->ordered()
                ->get();

            return \App\Http\Resources\PublicMiniCourseResource::collection($items);
        }, 'mini-courses'),
            300,
            600,
        );
    }

    public function show(string $slug)
    {
        $cacheKey = 'public_mini_courses:show:'.$slug;

        return HttpCache::withPublicCache(
            RuntimeCache::remember($cacheKey, 3600, function () use ($slug) {
            $item = MiniCourse::query()
                ->active()
                ->where('slug', $slug)
                ->firstOrFail();

            return new \App\Http\Resources\PublicMiniCourseResource($item);
        }, 'mini-courses'),
            300,
            600,
        );
    }

    public function comments(string $slug)
    {
        $cacheKey = 'public_mini_courses:comments:'.$slug;

        return HttpCache::withPublicCache(
            RuntimeCache::remember($cacheKey, 600, function () use ($slug) {
            $course = MiniCourse::query()
                ->active()
                ->where('slug', $slug)
                ->firstOrFail();

            if (! $course->comments_enabled) {
                return ContentCommentResource::collection(collect());
            }

            $comments = ContentComment::query()
                ->forContent(ContentComment::TYPE_MINI_COURSE, $slug)
                ->approved()
                ->topLevel()
                ->with(['replies' => fn ($q) => $q->approved()->orderBy('id')])
                ->orderByDesc('created_at')
                ->get();

            return ContentCommentResource::collection($comments);
        }, 'content-comments'),
            300,
            600,
        );
    }
}
