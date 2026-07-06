'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { AiImagePromptModal } from './AiImagePromptModal';

interface AiImageButtonProps {
  prompt: string;
  purpose: 'cover' | 'inline';
  onGenerated: (url: string) => void;
  label?: string;
  className?: string;
}

export function AiImageButton({ prompt, purpose, onGenerated, label, className }: AiImageButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!prompt.trim()}
        className="btn btn-secondary w-full justify-center py-2 text-small"
      >
        <Sparkles className="h-4 w-4" />
        {label ?? (purpose === 'cover' ? 'تولید تصویر شاخص با AI' : 'تولید تصویر با AI')}
      </button>

      <AiImagePromptModal
        open={open}
        defaultPrompt={prompt}
        purpose={purpose}
        onClose={() => setOpen(false)}
        onInsert={(url) => onGenerated(url)}
        title={purpose === 'cover' ? 'تولید تصویر شاخص' : 'تولید تصویر'}
      />
    </div>
  );
}
