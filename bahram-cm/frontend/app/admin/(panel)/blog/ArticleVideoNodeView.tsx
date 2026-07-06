'use client';

import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Pencil, Trash2 } from 'lucide-react';
import { ArticleVideoEmbed } from '@/components/blog/ArticleVideoEmbed';
import { resolveActiveSource, type VideoSource } from '@/lib/article/videoEmbed';
import { useArticleVideoEdit } from './ArticleVideoEditContext';

export function ArticleVideoNodeView({ node, selected, updateAttributes, deleteNode }: NodeViewProps) {
  const { youtube, aparat, direct, active } = node.attrs as {
    youtube?: string | null;
    aparat?: string | null;
    direct?: string | null;
    active?: VideoSource | null;
  };
  const videoEdit = useArticleVideoEdit();

  function openEdit(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    videoEdit?.openVideoEditor({
      initial: { youtube, aparat, direct, active },
      onSave: (attrs) => {
        updateAttributes({
          youtube: attrs.youtube || null,
          aparat: attrs.aparat || null,
          direct: attrs.direct || null,
          active: attrs.active,
        });
      },
    });
  }

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    deleteNode();
  }

  return (
    <NodeViewWrapper
      className={`group relative my-4 ${selected ? 'rounded-xl ring-2 ring-primary ring-offset-2' : ''}`}
      data-drag-handle
      onDoubleClick={openEdit}
    >
      <div
        className={`absolute top-2 z-20 flex gap-1 transition-opacity ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        style={{ left: '0.5rem' }}
        contentEditable={false}
      >
        <button
          type="button"
          onClick={openEdit}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface/95 text-text-muted shadow-sm backdrop-blur-sm hover:border-primary/40 hover:text-primary"
          title="ویرایش ویدیو"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface/95 text-text-muted shadow-sm backdrop-blur-sm hover:border-error/40 hover:text-error"
          title="حذف ویدیو"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <ArticleVideoEmbed
        youtube={youtube}
        aparat={aparat}
        direct={direct}
        active={resolveActiveSource({ youtube, aparat, direct, active })}
        eager
      />
    </NodeViewWrapper>
  );
}
