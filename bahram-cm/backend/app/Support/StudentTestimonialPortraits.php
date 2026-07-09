<?php

namespace App\Support;

/**
 * Portrait paths for student testimonials — mirrors frontend caseStudyPortrait pool.
 */
final class StudentTestimonialPortraits
{
    /** @var array<string, string> */
    private const BY_SLUG = [
        'sara-r' => '/storage/media/site/testimonial-01.webp',
        'amir-h' => '/storage/media/site/testimonial-03.webp',
        'nazanin-k' => '/storage/media/site/testimonial-02.webp',
        'reza-m' => '/storage/media/site/testimonial-04.webp',
    ];

    /** @var list<string> */
    private const POOL = [
        '/storage/media/site/testimonial-01.webp',
        '/storage/media/site/testimonial-02.webp',
        '/storage/media/site/testimonial-03.webp',
        '/storage/media/site/testimonial-04.webp',
        '/storage/media/site/social-01.jpg',
        '/storage/media/site/social-02.jpg',
        '/storage/media/site/social-03.jpg',
        '/storage/media/site/social-04.jpg',
        '/storage/media/site/social-05.jpg',
        '/storage/media/site/social-06.jpg',
        '/storage/media/site/square-studio.jpg',
    ];

    public static function forSlug(string $slug): string
    {
        if (isset(self::BY_SLUG[$slug])) {
            return self::BY_SLUG[$slug];
        }

        $hash = 0;
        $len = strlen($slug);
        for ($i = 0; $i < $len; $i++) {
            $hash = (($hash * 31) + ord($slug[$i])) & 0xFFFFFFFF;
        }

        return self::POOL[$hash % count(self::POOL)];
    }
}
