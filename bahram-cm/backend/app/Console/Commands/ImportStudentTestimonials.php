<?php

namespace App\Console\Commands;

use Database\Seeders\StudentTestimonialSeeder;
use Illuminate\Console\Command;

class ImportStudentTestimonials extends Command
{
    protected $signature = 'testimonials:import-mdx';

    protected $description = 'Import / transform student testimonials from frontend MDX files into the database';

    public function handle(): int
    {
        $this->call(StudentTestimonialSeeder::class);
        $this->info('Student testimonials imported from MDX.');

        return self::SUCCESS;
    }
}
