<?php

namespace App\Services;

use App\Models\Article;
use App\Models\ContentComment;
use App\Models\MiniCourse;
use App\Models\Seminar;
use App\Models\User;
use App\Support\StudentDisplayName;
use App\Support\StudentProfilePayload;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class ContentCommentService
{
    public function __construct(private readonly ContentPublishService $publish) {}

    /** @return \Illuminate\Database\Eloquent\Collection<int, ContentComment> */
    public function approvedFor(string $type, string $slug)
    {
        return ContentComment::query()
            ->forContent($type, $slug)
            ->approved()
            ->topLevel()
            ->with(['replies' => fn ($q) => $q->approved()->orderBy('id')])
            ->orderByDesc('created_at')
            ->get();
    }

    public function create(string $type, string $slug, array $data, ?User $user = null): ContentComment
    {
        $this->assertContentAllowsComments($type, $slug);

        $authorName = $user
            ? StudentDisplayName::fromUser($user)
            : trim((string) ($data['author_name'] ?? ''));

        if ($authorName === '') {
            throw ValidationException::withMessages([
                'author_name' => ['نام الزامی است.'],
            ]);
        }

        $authorEmail = $user?->profile?->email ?? ($data['author_email'] ?? null);
        $avatarUrl = $user ? $this->avatarUrlForUser($user) : null;

        $comment = ContentComment::create([
            'content_type' => $type,
            'content_slug' => $slug,
            'user_id' => $user?->id,
            'author_name' => $authorName,
            'author_email' => $authorEmail,
            'author_avatar_url' => $avatarUrl,
            'body' => $data['body'],
            'status' => 'pending',
        ]);

        $this->publish->revalidateContentComments($type, $slug);

        return $comment;
    }

    public function resolveOptionalUser(Request $request): ?User
    {
        $token = $request->bearerToken();
        if (! $token) {
            return null;
        }

        $accessToken = PersonalAccessToken::findToken($token);
        $user = $accessToken?->tokenable;

        return $user instanceof User ? $user : null;
    }

    private function avatarUrlForUser(User $user): ?string
    {
        $profile = StudentProfilePayload::fromUser($user);

        return $profile['avatar_url'] ?? $profile['default_avatar_url'] ?? null;
    }

    private function assertContentAllowsComments(string $type, string $slug): void
    {
        if (! in_array($type, ContentComment::TYPES, true)) {
            abort(404);
        }

        if ($type === ContentComment::TYPE_MINI_COURSE) {
            $course = MiniCourse::query()->active()->where('slug', $slug)->firstOrFail();
            if (! $course->comments_enabled) {
                abort(403, 'comments_disabled');
            }

            return;
        }

        if ($type === ContentComment::TYPE_ARTICLE) {
            Article::query()->published()->where('slug', $slug)->firstOrFail();

            return;
        }

        if ($type === ContentComment::TYPE_SEMINAR) {
            Seminar::query()->where('slug', $slug)->where('status', 'published')->firstOrFail();

            return;
        }

        if ($type === ContentComment::TYPE_COURSE) {
            if (! preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) {
                abort(404);
            }

            return;
        }

        if ($type === ContentComment::TYPE_CAMPAIGN_WRITING) {
            if ($slug !== 'campaign-writing') {
                abort(404);
            }

            return;
        }
    }
}
