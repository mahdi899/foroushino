import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { defaultVideoSource, type VideoSource } from '@/lib/article/videoEmbed';
import { ArticleVideoNodeView } from './ArticleVideoNodeView';

export interface ArticleVideoOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    articleVideo: {
      insertArticleVideo: (attrs: {
        youtube?: string;
        aparat?: string;
        direct?: string;
        active?: VideoSource;
      }) => ReturnType;
    };
  }
}

export const ArticleVideoExtension = Node.create<ArticleVideoOptions>({
  name: 'articleVideo',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      youtube: {
        default: null as string | null,
        parseHTML: (el) => el.getAttribute('data-youtube') || null,
      },
      aparat: {
        default: null as string | null,
        parseHTML: (el) => el.getAttribute('data-aparat') || null,
      },
      direct: {
        default: null as string | null,
        parseHTML: (el) => el.getAttribute('data-direct') || null,
      },
      active: {
        default: null as VideoSource | null,
        parseHTML: (el) => (el.getAttribute('data-active') as VideoSource) || null,
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-atrin-video="true"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const youtube = node.attrs.youtube ?? '';
    const aparat = node.attrs.aparat ?? '';
    const direct = node.attrs.direct ?? '';
    const active = node.attrs.active ?? defaultVideoSource(node.attrs);

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-atrin-video': 'true',
        class: 'atrin-video-embed',
        'data-youtube': youtube,
        'data-aparat': aparat,
        'data-direct': direct,
        'data-active': active,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ArticleVideoNodeView);
  },

  addCommands() {
    return {
      insertArticleVideo:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              youtube: attrs.youtube || null,
              aparat: attrs.aparat || null,
              direct: attrs.direct || null,
              active: attrs.active ?? defaultVideoSource(attrs),
            },
          }),
    };
  },
});
