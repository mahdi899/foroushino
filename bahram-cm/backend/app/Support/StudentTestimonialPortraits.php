<?php

namespace App\Support;

/**
 * Portrait paths for student testimonials — mirrors frontend caseStudyPortrait pool.
 * Stored as portable /storage/… references for the media library.
 */
final class StudentTestimonialPortraits
{
    /** @var array<string, string> */
    private const BY_SLUG = [
        'sara-r' => '/storage/media/site/testimonial-01.jpg',
        'amir-h' => '/storage/media/site/testimonial-02.jpg',
        'nazanin-k' => '/storage/media/site/testimonial-03.jpg',
        'reza-m' => '/storage/media/site/social-04.jpg',
    ];

    /** @var list<string> */
    private const POOL = [
        '/storage/media/site/testimonial-01.jpg',
        '/storage/media/site/testimonial-02.jpg',
        '/storage/media/site/testimonial-03.jpg',
        '/storage/media/site/social-01.jpg',
        '/storage/media/site/social-02.jpg',
        '/storage/media/site/social-03.jpg',
        '/storage/media/site/social-04.jpg',
        '/storage/media/site/social-05.jpg',
        '/storage/media/site/social-06.jpg',
        '/storage/media/site/square-studio.jpg',
        '/storage/media/site/manifesto-portrait-a.jpg',
        '/storage/media/site/manifesto-portrait-b.jpg',
        '/storage/media/site/cta-portrait.jpg',
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
