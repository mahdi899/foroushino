<?php

/**
 * Export FamilyCommentLexicon entries for the Next.js client guard.
 *
 * Usage (from bahram-cm/backend, PHP 8.4+ preferred):
 *   php scripts/export-family-comment-lexicon.php
 *
 * Writes: ../frontend/lib/family/commentLexicon.generated.json
 */

namespace App\Support {
    // Avoid pulling the full Laravel container when only exporting static lexicon data.
}

namespace {
    require dirname(__DIR__).'/app/Support/FamilyCommentLexicon.php';

    $entries = App\Support\FamilyCommentLexicon::entries();
    $out = [];
    foreach ($entries as $e) {
        $out[] = [
            'term' => $e['term'],
            'severity' => $e['severity'],
            'category' => $e['category'],
            'signal' => $e['signal'],
            'bounded' => (bool) ($e['bounded'] ?? false),
        ];
    }

    $path = dirname(__DIR__).'/../frontend/lib/family/commentLexicon.generated.json';
    $dir = dirname($path);
    if (! is_dir($dir)) {
        mkdir($dir, 0777, true);
    }

    file_put_contents($path, json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    fwrite(STDOUT, 'wrote '.count($out).' entries to '.$path.PHP_EOL);
}
