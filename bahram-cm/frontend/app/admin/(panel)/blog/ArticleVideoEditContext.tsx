'use client';

import { createContext, useContext } from 'react';
import type { ArticleVideoAttrs, VideoSource } from '@/lib/article/videoEmbed';

export interface VideoFormResult {
  youtube: string;
  aparat: string;
  direct: string;
  active: VideoSource;
}

export interface VideoEditRequest {
  initial: ArticleVideoAttrs;
  onSave: (attrs: VideoFormResult) => void;
}

export const ArticleVideoEditContext = createContext<{
  openVideoEditor: (request: VideoEditRequest) => void;
} | null>(null);

export function useArticleVideoEdit() {
  return useContext(ArticleVideoEditContext);
}
