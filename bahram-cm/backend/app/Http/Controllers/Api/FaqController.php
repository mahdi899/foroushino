<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\FaqResource;
use App\Models\Faq;
use Illuminate\Http\Request;

class FaqController extends Controller
{
    /**
     * List active FAQs ordered for public display.
     */
    public function index(Request $request)
    {
        $faqs = Faq::query()
            ->active()
            ->ordered()
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->string('category')))
            ->get();

        return FaqResource::collection($faqs);
    }
}
