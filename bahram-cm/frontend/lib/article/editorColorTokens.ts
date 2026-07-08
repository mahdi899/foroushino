export type ArticleTextColorTone = 'ink' | 'brand' | 'gold' | 'muted' | 'danger' | 'info';
export type ArticleHighlightTone = 'gold' | 'green' | 'blue' | 'coral' | 'amber';

export type EditorColorSwatch = {
  label: string;
  value: string;
  swatchClass: string;
};

export const ARTICLE_TEXT_COLOR_SWATCHES: readonly EditorColorSwatch[] = [
  { label: 'پیش‌فرض', value: '', swatchClass: 'article-editor-swatch-reset' },
  { label: 'متن اصلی', value: 'ink', swatchClass: 'article-swatch-tc-ink' },
  { label: 'سبز برند', value: 'brand', swatchClass: 'article-swatch-tc-brand' },
  { label: 'طلایی', value: 'gold', swatchClass: 'article-swatch-tc-gold' },
  { label: 'کمرنگ', value: 'muted', swatchClass: 'article-swatch-tc-muted' },
  { label: 'قرمز', value: 'danger', swatchClass: 'article-swatch-tc-danger' },
  { label: 'آبی', value: 'info', swatchClass: 'article-swatch-tc-info' },
];

export const ARTICLE_HIGHLIGHT_SWATCHES: readonly EditorColorSwatch[] = [
  { label: 'بدون', value: '', swatchClass: 'article-editor-swatch-reset' },
  { label: 'طلایی', value: 'gold', swatchClass: 'article-swatch-hl-gold' },
  { label: 'سبز', value: 'green', swatchClass: 'article-swatch-hl-green' },
  { label: 'آبی', value: 'blue', swatchClass: 'article-swatch-hl-blue' },
  { label: 'مرجانی', value: 'coral', swatchClass: 'article-swatch-hl-coral' },
  { label: 'کهربایی', value: 'amber', swatchClass: 'article-swatch-hl-amber' },
];
