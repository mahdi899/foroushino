import { Mark, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    articleTextColor: {
      setArticleTextColor: (tone: string) => ReturnType;
      unsetArticleTextColor: () => ReturnType;
    };
  }
}

/** Theme-aware text color — saved as data-article-tc, styled via CSS on site light/dark. */
export const ArticleTextColor = Mark.create({
  name: 'articleTextColor',
  priority: 1010,
  addAttributes() {
    return {
      tone: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-article-tc'),
        renderHTML: (attributes) => {
          if (!attributes.tone) return {};
          return { 'data-article-tc': attributes.tone };
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-article-tc]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      setArticleTextColor:
        (tone: string) =>
        ({ chain }) =>
          chain().setMark(this.name, { tone }).run(),
      unsetArticleTextColor:
        () =>
        ({ chain }) =>
          chain().unsetMark(this.name).run(),
    };
  },
});
