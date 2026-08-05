<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LandingPage;
use App\Support\MediaUrl;
use Illuminate\Http\JsonResponse;

class LandingPageController extends Controller
{
    public function show(string $slug): JsonResponse
    {
        $page = LandingPage::where('slug', $slug)->where('is_published', true)->first();

        if (! $page) {
            return response()->json([
                'error' => ['code' => 'not_found', 'message_fa' => 'صفحه یافت نشد.'],
            ], 404);
        }

        $heroImage = $page->hero_image
            ? (MediaUrl::fromDiskPath($page->hero_image) ?? MediaUrl::reference($page->hero_image))
            : null;

        return response()->json([
            'data' => [
                'slug' => $page->slug,
                'title' => $page->title,
                'subtitle' => $page->subtitle,
                'body' => $page->body,
                'hero_image' => $heroImage,
                'submit_label' => $page->submit_label,
                'success_message' => $page->success_message,
                'form_fields' => array_merge(LandingPage::defaultFormFields(), $page->form_fields ?? []),
            ],
        ]);
    }
}
