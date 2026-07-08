import { Mark, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    articleHighlight: {
      setArticleHighlight: (tone: string) => ReturnType;
      unsetArticleHighlight: () => ReturnType;
    };
  }
}

/** Theme-aware highlight — saved as data-article-hl, styled via CSS on site light/dark. */
export const ArticleHighlight = Mark.create({
  name: 'articleHighlight',
  addAttributes() {
    return {
      tone: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-article-hl'),
        renderHTML: (attributes) => {
          if (!attributes.tone) return {};
          return { 'data-article-hl': attributes.tone };
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: 'mark[data-article-hl]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['mark', mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      setArticleHighlight:
        (tone: string) =>
        ({ chain }) =>
          chain().setMark(this.name, { tone }).run(),
      unsetArticleHighlight:
        () =>
        ({ chain }) =>
          chain().unsetMark(this.name).run(),
    };
  },
});
