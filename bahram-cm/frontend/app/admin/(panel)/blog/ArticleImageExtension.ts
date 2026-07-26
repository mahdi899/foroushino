import Image from '@tiptap/extension-image';
import { mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { persistMediaUrl } from '@/lib/mediaUrl';
import { ArticleImageNodeView } from './ArticleImageNodeView';

/** Inline article images — portable src + width/height for CLS-safe static HTML. */
export const ArticleImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
        parseHTML: (element) => {
          const raw = element.getAttribute('src');
          return raw ? persistMediaUrl(raw) || raw : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.src) return {};
          const portable = persistMediaUrl(attributes.src) || attributes.src;
          return { src: portable };
        },
      },
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

  renderHTML({ HTMLAttributes }) {
    const portable = persistMediaUrl(HTMLAttributes.src) || HTMLAttributes.src;
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { src: portable })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ArticleImageNodeView);
  },
});
