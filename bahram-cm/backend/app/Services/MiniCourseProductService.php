<?php

namespace App\Services;

use App\Enums\ProductType;
use App\Models\MiniCourse;
use App\Models\Product;
use Illuminate\Support\Str;

class MiniCourseProductService
{
    public function syncProduct(MiniCourse $course): void
    {
        $slug = 'mini-course-'.$course->slug;

        $attributes = [
            'title' => $course->title,
            'type' => ProductType::MiniCourse->value,
            'short_description' => Str::limit((string) ($course->summary ?: $course->subtitle ?: ''), 240) ?: null,
            'price' => 0,
            'sale_price' => null,
            'is_active' => (bool) $course->is_active,
            'show_on_courses' => false,
            'featured_listing' => false,
            'landing_href' => '/mini-courses/'.$course->slug,
            'featured_image' => $course->thumbnail,
        ];

        if ($course->product_id) {
            Product::query()->whereKey($course->product_id)->update($attributes);

            return;
        }

        $product = Product::query()->create(array_merge($attributes, [
            'slug' => $this->uniqueProductSlug($slug),
        ]));

        $course->forceFill(['product_id' => $product->id])->saveQuietly();
    }

    private function uniqueProductSlug(string $base): string
    {
        $slug = $base;
        $suffix = 2;

        while (Product::query()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$suffix;
            $suffix++;
        }

        return $slug;
    }
}
