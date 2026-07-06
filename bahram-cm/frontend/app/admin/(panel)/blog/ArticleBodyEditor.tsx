'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import {
  AlignCenter,
  AlignJustify,
  AlignRight,
  Bold,
  Code2,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Sparkles,
  Strikethrough,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
  Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { linkAttrsFromEditor, parseLinkRel, type LinkEditorValues } from '@/lib/article/linkAttrs';
import { useAdminFocus } from '../AdminFocusContext';
import { ImageGalleryModal } from '../content/ImageGalleryModal';
import { AiImagePromptModal } from '../content/AiImagePromptModal';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import { ArticleVideoExtension } from './ArticleVideoExtension';
import { ArticleVideoEditContext, type VideoEditRequest } from './ArticleVideoEditContext';
import { VideoInsertModal } from './VideoInsertModal';
import { LinkEditModal } from './LinkEditModal';
import { TableEditorModal, type TableManageAction } from './TableEditorModal';

type EditorMode = 'visual' | 'html';

interface ArticleBodyEditorProps {
  value: string;
  onChange: (html: string) => void;
  label?: string;
  placeholder?: string;
  aiPrompt?: string;
}

function EditorModeToggle({ mode, onChange }: { mode: EditorMode; onChange: (next: EditorMode) => void }) {
  return (
    <div
      className="flex shrink-0 rounded-lg border-2 border-primary/20 bg-surface p-0.5 shadow-sm"
      role="tablist"
      aria-label="حالت ویرایش"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'visual'}
        onClick={() => onChange('visual')}
        className={cn(
          'rounded-md px-3.5 py-1.5 text-caption font-bold transition',
          mode === 'visual' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:bg-surface-soft hover:text-primary',
        )}
      >
        بصری
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'html'}
        onClick={() => onChange('html')}
        className={cn(
          'rounded-md px-3.5 py-1.5 text-caption font-bold transition',
          mode === 'html' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:bg-surface-soft hover:text-primary',
        )}
      >
        HTML
      </button>
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
  disabled,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'rounded-md p-1.5 transition disabled:opacity-40',
        active ? 'bg-primary text-white' : 'text-text-muted hover:bg-surface-soft hover:text-primary',
      )}
    >
      {children}
    </button>
  );
}

export function ArticleBodyEditor({
  value,
  onChange,
  label = 'متن مقاله',
  placeholder = 'متن مقاله را بنویسید…',
  aiPrompt,
}: ArticleBodyEditorProps) {
  const [mode, setMode] = useState<EditorMode>('visual');
  const [htmlDraft, setHtmlDraft] = useState(value);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [videoInsertOpen, setVideoInsertOpen] = useState(false);
  const [videoEditRequest, setVideoEditRequest] = useState<VideoEditRequest | null>(null);
  const [aiImageOpen, setAiImageOpen] = useState(false);
  const [linkEditOpen, setLinkEditOpen] = useState(false);
  const [linkEditInitial, setLinkEditInitial] = useState<LinkEditorValues>({
    href: '',
    openInNewTab: false,
    nofollow: false,
    sponsored: false,
  });
  const [linkNeedsSelection, setLinkNeedsSelection] = useState(false);
  const linkSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const tableSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const [editorTick, setEditorTick] = useState(0);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [tableModalMode, setTableModalMode] = useState<'insert' | 'manage'>('insert');
  const { focusMode } = useAdminFocus();
  const toolbarStickyTop = focusMode ? 'top-11' : 'top-14';

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-accent underline' },
        isAllowedUri: (url, ctx) =>
          url.startsWith('/') || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:') || ctx.defaultValidate(url),
      }),
      Image.configure({ HTMLAttributes: { class: 'rounded-lg max-w-full h-auto my-4' } }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      ArticleVideoExtension,
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'article-editor-visual min-h-[20rem] px-4 py-3 text-body leading-8 text-text focus:outline-none',
        dir: 'rtl',
      },
    },
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  });

  useEffect(() => {
    if (!editor || mode !== 'visual') return;
    const current = editor.getHTML();
    if (value !== current) editor.commands.setContent(value || '', { emitUpdate: false });
  }, [editor, value, mode]);

  useEffect(() => {
    if (!editor) return;
    const refresh = () => setEditorTick((t) => t + 1);
    editor.on('selectionUpdate', refresh);
    editor.on('transaction', refresh);
    return () => {
      editor.off('selectionUpdate', refresh);
      editor.off('transaction', refresh);
    };
  }, [editor]);

  useEffect(() => {
    if (mode === 'html') setHtmlDraft(value);
  }, [mode, value]);

  const switchMode = useCallback(
    (next: EditorMode) => {
      if (next === mode) return;
      if (mode === 'visual' && editor) {
        const html = editor.getHTML();
        onChange(html);
        setHtmlDraft(html);
      } else if (next === 'visual') {
        onChange(htmlDraft);
        editor?.commands.setContent(htmlDraft || '', { emitUpdate: false });
      }
      setMode(next);
    },
    [editor, htmlDraft, mode, onChange],
  );

  const restoreLinkSelection = useCallback(() => {
    if (!editor) return;
    const saved = linkSelectionRef.current;
    if (saved) {
      editor.commands.setTextSelection({ from: saved.from, to: saved.to });
    }
    editor.commands.focus();
  }, [editor]);

  const openLinkEditor = useCallback(() => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    linkSelectionRef.current = { from, to };
    const onLink = editor.isActive('link');
    setLinkNeedsSelection(empty && !onLink);
    const attrs = editor.getAttributes('link');
    setLinkEditInitial({
      href: (attrs.href as string | undefined) ?? '',
      openInNewTab: attrs.target === '_blank',
      ...parseLinkRel(attrs.rel as string | undefined),
    });
    setLinkEditOpen(true);
  }, [editor]);

  const applyLink = useCallback(
    (values: LinkEditorValues): boolean => {
      if (!editor) return false;
      const href = values.href.trim();
      restoreLinkSelection();

      if (!href) {
        editor.chain().extendMarkRange('link').unsetLink().run();
        linkSelectionRef.current = null;
        setLinkEditOpen(false);
        return true;
      }

      const { empty } = editor.state.selection;
      const onLink = editor.isActive('link');
      if (empty && !onLink) {
        setLinkNeedsSelection(true);
        return false;
      }

      const attrs = linkAttrsFromEditor({ ...values, href });
      const applied = empty
        ? editor.chain().extendMarkRange('link').setLink(attrs).run()
        : editor.chain().setLink(attrs).run();

      if (!applied) return false;

      linkSelectionRef.current = null;
      setLinkNeedsSelection(false);
      setLinkEditOpen(false);
      return true;
    },
    [editor, restoreLinkSelection],
  );

  const removeLink = useCallback(() => {
    if (!editor) return;
    restoreLinkSelection();
    editor.chain().extendMarkRange('link').unsetLink().run();
    linkSelectionRef.current = null;
    setLinkNeedsSelection(false);
  }, [editor, restoreLinkSelection]);

  const insertAiImage = useCallback(
    (url: string, alt: string) => {
      editor?.chain().focus().setImage({ src: resolveMediaUrl(url), alt }).run();
    },
    [editor],
  );

  const insertVideo = useCallback(
    (attrs: { youtube: string; aparat: string; direct: string; active: 'youtube' | 'aparat' | 'direct' }) => {
      editor?.chain().focus().insertArticleVideo(attrs).run();
    },
    [editor],
  );

  const openVideoEditor = useCallback((request: VideoEditRequest) => {
    setVideoEditRequest(request);
  }, []);

  const videoEditContextValue = useMemo(() => ({ openVideoEditor }), [openVideoEditor]);

  const editSelectedVideo = useCallback(() => {
    if (!editor?.isActive('articleVideo')) return;
    const attrs = editor.getAttributes('articleVideo');
    openVideoEditor({
      initial: attrs,
      onSave: (saved) => {
        editor
          .chain()
          .focus()
          .updateAttributes('articleVideo', {
            youtube: saved.youtube || null,
            aparat: saved.aparat || null,
            direct: saved.direct || null,
            active: saved.active,
          })
          .run();
      },
    });
  }, [editor, openVideoEditor]);

  const handleVideoToolbar = useCallback(() => {
    if (editor?.isActive('articleVideo')) {
      editSelectedVideo();
      return;
    }
    setVideoInsertOpen(true);
  }, [editor, editSelectedVideo]);

  const restoreTableSelection = useCallback(() => {
    if (!editor) return;
    const saved = tableSelectionRef.current;
    if (saved) {
      editor.commands.setTextSelection({ from: saved.from, to: saved.to });
    }
    editor.commands.focus();
  }, [editor]);

  const handleTableToolbar = useCallback(() => {
    if (!editor) return;
    const inTable = editor.isActive('table');
    const { from, to } = editor.state.selection;
    tableSelectionRef.current = { from, to };
    setTableModalMode(inTable ? 'manage' : 'insert');
    setTableModalOpen(true);
  }, [editor]);

  const insertTable = useCallback(
    (opts: { rows: number; cols: number; withHeaderRow: boolean }) => {
      editor?.chain().focus().insertTable(opts).run();
      tableSelectionRef.current = null;
    },
    [editor],
  );

  const manageTable = useCallback(
    (action: TableManageAction) => {
      if (!editor) return;
      restoreTableSelection();
      const chain = editor.chain();
      switch (action) {
        case 'addRowBefore':
          chain.addRowBefore().run();
          break;
        case 'addRowAfter':
          chain.addRowAfter().run();
          break;
        case 'deleteRow':
          chain.deleteRow().run();
          break;
        case 'addColumnBefore':
          chain.addColumnBefore().run();
          break;
        case 'addColumnAfter':
          chain.addColumnAfter().run();
          break;
        case 'deleteColumn':
          chain.deleteColumn().run();
          break;
        case 'deleteTable':
          chain.deleteTable().run();
          tableSelectionRef.current = null;
          break;
      }
      if (action !== 'deleteTable') {
        const { from, to } = editor.state.selection;
        tableSelectionRef.current = { from, to };
      }
    },
    [editor, restoreTableSelection],
  );

  const toolbar = useMemo(() => {
    return (
      <div
        className={cn(
          'sticky z-20 flex flex-wrap items-center gap-2 border-b border-border bg-surface/95 px-2 py-1.5 shadow-sm backdrop-blur-sm',
          toolbarStickyTop,
        )}
      >
        {mode === 'visual' && editor && (
          <div className="flex flex-1 flex-wrap items-center gap-0.5">
            <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="درشت">
              <Bold className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="کج">
              <Italic className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="زیرخط">
              <UnderlineIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="خط‌خورده">
              <Strikethrough className="h-4 w-4" />
            </ToolbarButton>
            <span className="mx-1 h-5 w-px bg-border" />
            <ToolbarButton active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="سرتیتر ۲">
              <Heading2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="سرتیتر ۳">
              <Heading3 className="h-4 w-4" />
            </ToolbarButton>
            <span className="mx-1 h-5 w-px bg-border" />
            <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="لیست">
              <List className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="لیست شماره‌دار">
              <ListOrdered className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="نقل‌قول">
              <Quote className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="خط جداکننده">
              <Minus className="h-4 w-4" />
            </ToolbarButton>
            <span className="mx-1 h-5 w-px bg-border" />
            <ToolbarButton active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="راست‌چین">
              <AlignRight className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="وسط">
              <AlignCenter className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="تمام‌عرض">
              <AlignJustify className="h-4 w-4" />
            </ToolbarButton>
            <span className="mx-1 h-5 w-px bg-border" />
            <ToolbarButton active={editor.isActive('link')} onClick={openLinkEditor} title="لینک">
              <Link2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive('table')}
              onClick={handleTableToolbar}
              title={editor.isActive('table') ? 'مدیریت جدول' : 'درج جدول'}
            >
              <TableIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => setGalleryOpen(true)} title="درج تصویر از گالری">
              <ImageIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive('articleVideo')}
              onClick={handleVideoToolbar}
              title={editor.isActive('articleVideo') ? 'ویرایش ویدیو' : 'درج ویدیو'}
            >
              <Video className="h-4 w-4" />
            </ToolbarButton>
            {aiPrompt !== undefined && (
              <ToolbarButton
                onClick={() => {
                  if (!aiPrompt.trim()) return;
                  setAiImageOpen(true);
                }}
                disabled={!aiPrompt?.trim()}
                title="تولید تصویر با AI"
              >
                <Sparkles className="h-4 w-4" />
              </ToolbarButton>
            )}
            <ToolbarButton active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="بلوک کد">
              <Code2 className="h-4 w-4" />
            </ToolbarButton>
            <span className="mx-1 h-5 w-px bg-border" />
            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="بازگشت">
              <Undo2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="از نو">
              <Redo2 className="h-4 w-4" />
            </ToolbarButton>
          </div>
        )}
        {mode === 'html' && (
          <p className="flex-1 text-caption text-text-muted">ویرایش مستقیم HTML</p>
        )}
        <EditorModeToggle mode={mode} onChange={switchMode} />
      </div>
    );
  }, [editor, editorTick, mode, openLinkEditor, switchMode, aiPrompt, toolbarStickyTop, handleVideoToolbar, handleTableToolbar]);

  return (
    <ArticleVideoEditContext.Provider value={videoEditContextValue}>
    <div>
      <label className="field-label">{label}</label>
      <div className="rounded-lg border border-border bg-surface">
        {toolbar}
        <div className="min-h-[20rem]">
          {mode === 'visual' ? (
            <EditorContent editor={editor} />
          ) : (
            <textarea
              dir="ltr"
              value={htmlDraft}
              onChange={(e) => {
                setHtmlDraft(e.target.value);
                onChange(e.target.value);
              }}
              placeholder="<p>محتوای HTML مقاله…</p>"
              className="min-h-[20rem] w-full resize-y border-0 bg-surface px-4 py-3 font-mono text-small leading-7 text-text focus:outline-none"
              spellCheck={false}
            />
          )}
        </div>
      </div>
      {aiPrompt !== undefined && (
        <AiImagePromptModal
          open={aiImageOpen}
          defaultPrompt={aiPrompt}
          purpose="inline"
          onClose={() => setAiImageOpen(false)}
          onInsert={insertAiImage}
          title="تولید تصویر داخل مقاله"
        />
      )}

      <ImageGalleryModal
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        value=""
        onSelect={(src, label) => {
          editor?.chain().focus().setImage({ src, alt: label }).run();
          setGalleryOpen(false);
        }}
        title="درج تصویر در متن"
      />

      <VideoInsertModal
        open={videoInsertOpen || Boolean(videoEditRequest)}
        mode={videoEditRequest ? 'edit' : 'insert'}
        initialValues={videoEditRequest?.initial}
        onClose={() => {
          setVideoInsertOpen(false);
          setVideoEditRequest(null);
        }}
        onInsert={(attrs) => {
          if (videoEditRequest) {
            videoEditRequest.onSave(attrs);
            setVideoEditRequest(null);
          } else {
            insertVideo(attrs);
            setVideoInsertOpen(false);
          }
        }}
      />

      <LinkEditModal
        open={linkEditOpen}
        initial={linkEditInitial}
        needsSelection={linkNeedsSelection}
        onClose={() => {
          setLinkEditOpen(false);
          setLinkNeedsSelection(false);
          linkSelectionRef.current = null;
        }}
        onApply={applyLink}
        onRemove={removeLink}
      />

      <TableEditorModal
        open={tableModalOpen}
        mode={tableModalMode}
        onClose={() => {
          setTableModalOpen(false);
          tableSelectionRef.current = null;
        }}
        onInsert={insertTable}
        onManage={manageTable}
      />

      <style jsx global>{`
        .article-editor-visual h2 {
          font-size: 1.35rem;
          font-weight: 800;
          color: #064c45;
          margin: 1.25rem 0 0.75rem;
        }
        .article-editor-visual h3 {
          font-size: 1.125rem;
          font-weight: 700;
          color: #064c45;
          margin: 1rem 0 0.5rem;
        }
        .article-editor-visual p {
          margin: 0.5rem 0;
        }
        .article-editor-visual blockquote {
          margin: 1rem 0;
          padding: 0.75rem 1rem;
          border-right: 3px solid #c9a227;
          background: rgba(236, 243, 239, 0.6);
          border-radius: 0.5rem;
        }
        .article-editor-visual pre {
          margin: 1rem 0;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          background: #0f172a;
          color: #e2e8f0;
          overflow-x: auto;
          font-family: ui-monospace, monospace;
          font-size: 0.8125rem;
          direction: ltr;
          text-align: left;
        }
        .article-editor-visual .is-editor-empty:first-child::before {
          color: #94a3b8;
          content: attr(data-placeholder);
          float: right;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
    </ArticleVideoEditContext.Provider>
  );
}
