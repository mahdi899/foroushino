import Image from '@tiptap/extension-image';

/** Inline article images — portable src + width/height for CLS-safe static HTML. */
export const ArticleImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute('width'),
        renderHTML: (attributes) => (attributes.width ? { width: attributes.width } : {}),
      },
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute('height'),
        renderHTML: (attributes) => (attributes.height ? { height: attributes.height } : {}),
      },
    };
  },
});
