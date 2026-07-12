<?php

namespace App\Support;

use HTMLPurifier_HTMLDefinition;
use Stevebauman\Purify\Definitions\Definition;
use Stevebauman\Purify\Definitions\Html5Definition;

class ArticleHtmlDefinition implements Definition
{
    public static function apply(HTMLPurifier_HTMLDefinition $definition): void
    {
        Html5Definition::apply($definition);

        foreach (['data-atrin-video', 'data-youtube', 'data-aparat', 'data-direct'] as $attr) {
            $definition->addAttribute('div', $attr, 'Text');
        }

        $definition->addAttribute('div', 'data-active', 'Enum#aparat,youtube,direct');
    }
}
