<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\MiniCourseCommentResource;
use App\Http\Resources\MiniCourseResource;
use App\Models\MiniCourse;
use App\Models\MiniCourseComment;
use App\Support\RuntimeCache;
use Illuminate\Http\Request;

class MiniCourseController extends Controller
{
    public function index(Request $request)
    {
        $cacheKey = 'public_mini_courses:index';

        return RuntimeCache::remember($cacheKey, 3600, function () {
            $items = MiniCourse::query()
                ->active()
                ->ordered()
                ->get();

            return MiniCourseResource::collection($items);
        }, 'mini-courses');
    }

    public function show(string $slug)
    {
        $cacheKey = 'public_mini_courses:show:'.$slug;

        return RuntimeCache::remember($cacheKey, 3600, function () use ($slug) {
            $item = MiniCourse::query()
                ->active()
                ->where('slug', $slug)
                ->firstOrFail();

            return new MiniCourseResource($item);
        }, 'mini-courses');
    }

    public function comments(string $slug)
    {
        $cacheKey = 'public_mini_courses:comments:'.$slug;

        return RuntimeCache::remember($cacheKey, 600, function () use ($slug) {
            $course = MiniCourse::query()
                ->active()
                ->where('slug', $slug)
                ->firstOrFail();

            if (! $course->comments_enabled) {
                return MiniCourseCommentResource::collection(collect());
            }

            $comments = MiniCourseComment::query()
                ->where('mini_course_id', $course->id)
                ->approved()
                ->topLevel()
                ->with(['replies' => fn ($q) => $q->approved()->orderBy('id')])
                ->orderByDesc('created_at')
                ->get();

            return MiniCourseCommentResource::collection($comments);
        }, 'mini-courses');
    }
}
