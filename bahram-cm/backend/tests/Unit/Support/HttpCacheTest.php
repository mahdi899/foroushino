<?php

namespace Tests\Unit\Support;

use App\Support\HttpCache;
use Illuminate\Http\Request;
use Tests\TestCase;

class HttpCacheTest extends TestCase
{
    public function test_etag_is_stable_for_same_parts(): void
    {
        $this->assertSame(HttpCache::etag('a', 1, 'b'), HttpCache::etag('a', 1, 'b'));
    }

    public function test_matches_if_none_match_header(): void
    {
        $request = Request::create('/test', 'GET', server: ['HTTP_IF_NONE_MATCH' => '"foo-1"']);

        $this->assertTrue(HttpCache::matches($request, '"foo-1"'));
        $this->assertFalse(HttpCache::matches($request, '"bar-2"'));
    }

    public function test_conditional_json_returns_304_when_etag_matches(): void
    {
        $request = Request::create('/test', 'GET', server: ['HTTP_IF_NONE_MATCH' => '"rev-1"']);
        $response = HttpCache::conditionalJson(
            $request,
            ['ok' => true],
            '"rev-1"',
            'private, max-age=45, must-revalidate',
        );

        $this->assertSame(304, $response->getStatusCode());
        $this->assertSame('"rev-1"', $response->headers->get('ETag'));
    }
}
