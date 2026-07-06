<?php

namespace App\Console\Commands;

use App\Models\StudentTestimonial;
use App\Support\StudentTestimonialPortraits;
use Illuminate\Console\Command;

class AssignStudentTestimonialPortraits extends Command
{
    protected $signature = 'testimonials:assign-portraits {--only-missing : Skip rows that already have a portrait}';

    protected $description = 'Assign gallery portrait images to student testimonials';

    public function handle(): int
    {
        $onlyMissing = (bool) $this->option('only-missing');
        $updated = 0;

        StudentTestimonial::query()->orderBy('id')->each(function (StudentTestimonial $item) use ($onlyMissing, &$updated) {
            if ($onlyMissing && filled($item->portrait_image)) {
                return;
            }

            $portrait = StudentTestimonialPortraits::forSlug($item->slug);
            if ($item->portrait_image === $portrait) {
                return;
            }

            $item->update(['portrait_image' => $portrait]);
            $updated++;
        });

        $this->info("Assigned portraits to {$updated} testimonial(s).");

        return self::SUCCESS;
    }
}
