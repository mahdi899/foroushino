<?php

namespace App\Http\Controllers\Api\V1\FamilyManager;

use App\Enums\Family\FamilyPostAudienceMode;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\Family\FamilyStoryResource;
use App\Models\FamilyMedia;
use App\Models\FamilyStory;
use App\Services\AdminAuditLogger;
use App\Services\Family\FamilyStoryService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StoryController extends Controller
{
    public function __construct(
        private readonly FamilyStoryService $stories,
        private readonly AdminAuditLogger $audit,
    ) {}

    public function index(): JsonResponse
    {
        $stories = FamilyStory::query()
            ->with(['media', 'publisher:id,name', 'targets.family:id,internal_name'])
            ->orderByDesc('published_at')
            ->limit(50)
            ->get();

        return ApiResponse::success(
            FamilyStoryResource::collection($stories)->resolve(),
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'media_id' => ['required', 'integer', 'exists:family_media,id'],
            'caption' => ['nullable', 'string', 'max:500'],
            'audience_mode' => ['sometimes', 'string', Rule::in(FamilyPostAudienceMode::values())],
            'family_ids' => ['sometimes', 'array'],
            'family_ids.*' => ['integer', 'exists:families,id'],
        ]);

        $mode = $data['audience_mode'] ?? FamilyPostAudienceMode::All->value;
        $familyIds = array_values(array_unique(array_map('intval', $data['family_ids'] ?? [])));

        if ($mode !== FamilyPostAudienceMode::All->value && $familyIds === []) {
            throw ValidationException::withMessages([
                'family_ids' => ['برای مخاطب انتخابی حداقل یک خانواده لازم است.'],
            ]);
        }

        $media = FamilyMedia::query()->findOrFail($data['media_id']);
        $this->assertStoryMediaAspect($media);
        $story = $this->stories->publish(
            $request->user(),
            $media,
            $data['caption'] ?? null,
            $mode,
            $familyIds,
        );
        $this->audit->log($request->user(), 'family.story_published', $story);

        return ApiResponse::success((new FamilyStoryResource($story))->resolve(), 201);
    }

    public function destroy(Request $request, FamilyStory $story): JsonResponse
    {
        $this->audit->log($request->user(), 'family.story_deleted', $story);
        $this->stories->delete($story);

        return ApiResponse::success(['deleted' => true]);
    }

    private function assertStoryMediaAspect(FamilyMedia $media): void
    {
        $type = $media->type?->value ?? $media->type;
        if (! in_array($type, ['image', 'video'], true)) {
            throw ValidationException::withMessages([
                'media_id' => ['برای استوری فقط تصویر یا ویدیو مجاز است.'],
            ]);
        }

        if (! $media->width || ! $media->height) {
            return;
        }

        if ($media->height <= $media->width) {
            throw ValidationException::withMessages([
                'media_id' => ['استوری باید عمودی باشد (نسبت ۹:۱۶).'],
            ]);
        }

        $ratio = $media->height / $media->width;
        $target = 16 / 9;
        if (abs($ratio - $target) / $target > 0.12) {
            throw ValidationException::withMessages([
                'media_id' => ['نسبت تصویر استوری باید ۹:۱۶ باشد (مثلاً ۱۰۸۰×۱۹۲۰).'],
            ]);
        }
    }
}
