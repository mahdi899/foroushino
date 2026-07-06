export interface LinkOption {
  path: string;
  label: string;
  kind: string;
}

export interface RelatedArticleOption {
  path: string;
  title: string;
  excerpt: string;
}

export const LINK_SECTION_START = '--- ALLOWED INTERNAL LINKS ---';
export const LINK_SECTION_END = '--- END LINKS ---';
export const RELATED_SECTION_START = '--- RELATED BLOG ARTICLES ---';
export const RELATED_SECTION_END = '--- END RELATED ---';
export const CATEGORY_SECTION_START = '--- ARTICLE CATEGORY ---';
export const CATEGORY_SECTION_END = '--- END CATEGORY ---';

export function formatLinkSection(links: LinkOption[]): string {
  if (!links.length) return '';
  return [
    LINK_SECTION_START,
    'Use 4–6 of these internal links contextually in the article HTML (relative href only):',
    ...links.map((l) => `- ${l.path} | ${l.label} (${l.kind})`),
    LINK_SECTION_END,
  ].join('\n');
}

export function formatRelatedArticlesSection(articles: RelatedArticleOption[]): string {
  if (!articles.length) return '';
  return [
    RELATED_SECTION_START,
    'At the END of body HTML add h2 «مقالات مرتبط» with 3–5 items.',
    'Each item: linked title + 1–2 sentence Persian summary (adapt excerpt below).',
    'Also weave 1–2 of these links naturally earlier in the article where relevant:',
    ...articles.map((a) => `- ${a.path} | ${a.title} | خلاصه: ${a.excerpt}`),
    RELATED_SECTION_END,
  ].join('\n');
}

export function formatCategorySection(name: string): string {
  if (!name.trim()) return '';
  return [
    CATEGORY_SECTION_START,
    `Assign this exact Persian category to JSON field "category": ${name.trim()}`,
    'The category must appear in the article metadata — do not omit it.',
    CATEGORY_SECTION_END,
  ].join('\n');
}

export function upsertPromptSection(prompt: string, section: string, start: string, end: string): string {
  const block = section.trim();
  const regex = new RegExp(`${escapeRegex(start)}[\\s\\S]*?${escapeRegex(end)}`, 'm');
  if (!block) {
    return prompt.replace(regex, '').trim();
  }
  if (regex.test(prompt)) return prompt.replace(regex, block);
  return `${prompt.trim()}\n\n${block}`;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseLinkSection(prompt: string): LinkOption[] {
  const match = prompt.match(
    new RegExp(`${escapeRegex(LINK_SECTION_START)}([\\s\\S]*?)${escapeRegex(LINK_SECTION_END)}`, 'm'),
  );
  if (!match) return [];
  const lines = match[1].split('\n').map((l) => l.trim()).filter((l) => l.startsWith('- '));
  return lines
    .map((line) => {
      const body = line.slice(2);
      const [pathPart, rest] = body.split('|').map((s) => s.trim());
      const path = pathPart?.startsWith('/') ? pathPart : '';
      const label = rest?.replace(/\([^)]*\)$/, '').trim() ?? path;
      const kindMatch = rest?.match(/\(([^)]+)\)$/);
      return path ? { path, label, kind: kindMatch?.[1] ?? 'page' } : null;
    })
    .filter(Boolean) as LinkOption[];
}

export function parseCategorySection(prompt: string): string {
  const match = prompt.match(
    new RegExp(`${escapeRegex(CATEGORY_SECTION_START)}([\\s\\S]*?)${escapeRegex(CATEGORY_SECTION_END)}`, 'm'),
  );
  if (!match) return '';
  const line = match[1].split('\n').find((l) => l.includes('Category'));
  return line?.replace(/Category\s*\(Persian\)\s*:\s*/i, '').trim() ?? '';
}
