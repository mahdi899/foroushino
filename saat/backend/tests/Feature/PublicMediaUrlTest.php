<?php

use App\Support\PublicMediaUrl;

it('normalizes absolute storage urls to same-origin paths', function () {
    config(['app.url' => 'https://sat.center']);

    expect(PublicMediaUrl::normalize('https://sat.center/storage/avatars/users/1.jpg'))
        ->toBe('/storage/avatars/users/1.jpg');
});

it('hides external avatar hosts from api clients', function () {
    expect(PublicMediaUrl::normalize('https://cdn.telegram.org/photo.jpg'))->toBeNull();
});

it('builds public disk paths', function () {
    expect(PublicMediaUrl::forPublicDiskPath('avatars/users/3.webp'))
        ->toBe('/storage/avatars/users/3.webp');
});

it('appends version query for cache busting', function () {
    $at = new DateTimeImmutable('2026-07-23 12:00:00');
    expect(PublicMediaUrl::withVersion('/storage/avatars/users/1.webp', $at))
        ->toBe('/storage/avatars/users/1.webp?v='.$at->getTimestamp());
});
