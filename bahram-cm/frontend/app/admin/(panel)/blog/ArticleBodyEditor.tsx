'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import type { Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Code2,
  Eraser,
  Highlighter,
  ImageIcon,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Palette,
  Quote,
  Redo2,
  Sparkles,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
  Unlink2,
  Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { linkAttrsFromEditor, parseLinkRel, type LinkEditorValues } from '@/lib/article/linkAttrs';
import {
  ARTICLE_HIGHLIGHT_SWATCHES,
  ARTICLE_TEXT_COLOR_SWATCHES,
  type EditorColorSwatch,
} from '@/lib/article/editorColorTokens';
import { ImageGalleryModal } from '../content/ImageGalleryModal';
import { AiImagePromptModal } from '../content/AiImagePromptModal';
import { resolveMediaUrl, persistMediaUrl } from '@/lib/mediaUrl';
import { ArticleImage } from './ArticleImageExtension';
import { ArticleTextColor } from './ArticleTextColorExtension';
import { ArticleHighlight } from './ArticleHighlightExtension';
import { ArticleVideoExtension } from './ArticleVideoExtension';
import { ArticleVideoEditContext, type VideoEditRequest } from './ArticleVideoEditContext';
import { VideoInsertModal } from './VideoInsertModal';
import { LinkEditModal } from './LinkEditModal';
import { TableEditorModal, type TableManageAction } from './TableEditorModal';
import { useAdminFocus } from '../AdminFocusContext';

type EditorMode = 'visual' | 'html';

interface ArticleBodyEditorProps {
  value: string;
  onChange: (html: string) => void;
  label?: string;
  placeholder?: string;
  aiPrompt?: string;
}

const toolbarRowClass = 'flex w-full min-w-0 flex-wrap items-center gap-1';

function ToolbarRow({ children }: { children: React.ReactNode }) {
  return <div className={toolbarRowClass}>{children}</div>;
}

const BLOCK_FORMATS = [
  { value: 'p', label: 'پاراگراف' },
  { value: 'h1', label: 'سرتیتر ۱' },
  { value: 'h2', label: 'سرتیتر ۲' },
  { value: 'h3', label: 'سرتیتر ۳' },
  { value: 'h4', label: 'سرتیتر ۴' },
  { value: 'h5', label: 'سرتیتر ۵' },
  { value: 'h6', label: 'سرتیتر ۶' },
] as const;

function getBlockFormat(editor: Editor): string {
  for (let level = 1; level <= 6; level += 1) {
    if (editor.isActive('heading', { level })) return `h${level}`;
  }
  return 'p';
}

function applyBlockFormat(editor: Editor, format: string) {
  const chain = editor.chain().focus();
  if (format === 'p') {
    chain.setParagraph().run();
    return;
  }
  const level = Number(format.replace('h', '')) as 1 | 2 | 3 | 4 | 5 | 6;
  chain.toggleHeading({ level }).run();
}

/** پاک‌سازی قالب‌بندی متن انتخاب‌شده یا پاراگراف جاری */
function clearFormatting(editor: Editor) {
  const { empty, $from } = editor.state.selection;
  let chain = editor.chain().focus();

  if (empty) {
    const start = $from.start();
    const end = $from.end();
    if (start < end) {
      chain = chain.setTextSelection({ from: start, to: end });
    }
  }

  if (editor.isActive('blockquote')) {
    chain = chain.toggleBlockquote();
  }

  if (editor.isActive('link')) {
    chain = chain.extendMarkRange('link');
  }

  chain
    .unsetAllMarks()
    .unsetLink()
    .unsetArticleTextColor()
    .unsetArticleHighlight()
    .unsetColor()
    .unsetHighlight()
    .unsetTextAlign()
    .clearNodes()
    .setParagraph()
    .run();
}

function ToolbarSeparator() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-border" />;
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
          'rounded-md px-2.5 py-1 text-caption font-bold transition sm:px-3.5 sm:py-1.5',
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
          'rounded-md px-2.5 py-1 text-caption font-bold transition sm:px-3.5 sm:py-1.5',
          mode === 'html' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:bg-surface-soft hover:text-primary',
        )}
      >
        HTML
      </button>
    </div>
  );
}

function ToolbarFormatSelect({ editor }: { editor: Editor }) {
  const value = getBlockFormat(editor);
  return (
    <select
      aria-label="قالب متن"
      value={value}
      onChange={(e) => applyBlockFormat(editor, e.target.value)}
      className="h-7 max-w-[7.5rem] shrink-0 rounded-md border border-border bg-surface px-2 text-caption text-text"
    >
      {BLOCK_FORMATS.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

function ToolbarSwatchMenu({
  title,
  colors,
  activeTone,
  onPick,
  children,
}: {
  title: string;
  colors: ReadonlyArray<EditorColorSwatch>;
  activeTone: string;
  onPick: (value: string) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <ToolbarButton active={Boolean(activeTone)} onClick={() => setOpen((current) => !current)} title={title}>
        {children}
      </ToolbarButton>
      {open && (
        <div className="absolute top-full z-30 mt-1 flex w-max flex-wrap gap-1 rounded-md border border-border bg-surface p-2 shadow-lg" style={{ right: 0 }}>
          {colors.map((color) => (
            <button
              key={color.value || 'default'}
              type="button"
              title={color.label}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onPick(color.value);
                setOpen(false);
              }}
              className={cn(
                'h-5 w-5 rounded border border-border',
                color.swatchClass,
                color.value === activeTone && 'ring-2 ring-primary',
              )}
            />
          ))}
        </div>
      )}
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
  const { focusMode } = useAdminFocus();
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

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      Underline,
      TextStyle,
      Color.configure({ types: [TextStyle.name] }),
      Highlight.configure({ multicolor: true }),
      ArticleTextColor,
      ArticleHighlight,
      Subscript,
      Superscript,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-accent underline' },
        isAllowedUri: (url, ctx) =>
          url.startsWith('/') || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:') || ctx.defaultValidate(url),
      }),
      ArticleImage.configure({ HTMLAttributes: { class: 'rounded-lg max-w-full h-auto my-4' } }),
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

  const insertArticleImage = useCallback(
    (url: string, alt: string, width?: number | null, height?: number | null) => {
      const src = persistMediaUrl(url) || url;
      editor
        ?.chain()
        .focus()
        .setImage({
          src,
          alt,
          ...(width && height ? { width, height } : {}),
        })
        .run();
    },
    [editor],
  );

  const insertAiImage = useCallback(
    (url: string, alt: string) => {
      insertArticleImage(url, alt);
    },
    [insertArticleImage],
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
    const visualToolbarButtons =
      mode === 'visual' && editor ? (
        <ToolbarRow>
          <ToolbarFormatSelect editor={editor} />
          <ToolbarSeparator />
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
          <ToolbarButton active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} title="کد درون‌خطی">
            <Code className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('subscript')} onClick={() => editor.chain().focus().toggleSubscript().run()} title="زیرنویس">
            <SubscriptIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('superscript')} onClick={() => editor.chain().focus().toggleSuperscript().run()} title="بالانویس">
            <SuperscriptIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarSeparator />
          <ToolbarButton active={editor.isActive('link')} onClick={openLinkEditor} title="لینک">
            <Link2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton disabled={!editor.isActive('link')} onClick={removeLink} title="حذف لینک">
            <Unlink2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => clearFormatting(editor)} title="پاک‌سازی قالب‌بندی">
            <Eraser className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarSeparator />
          <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="لیست">
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="لیست شماره‌دار">
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            disabled={!editor.can().sinkListItem('listItem')}
            onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
            title="تورفتگی"
          >
            <IndentIncrease className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            disabled={!editor.can().liftListItem('listItem')}
            onClick={() => editor.chain().focus().liftListItem('listItem').run()}
            title="بیرون‌آمدگی"
          >
            <IndentDecrease className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="نقل‌قول">
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="خط جداکننده">
            <Minus className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarSeparator />
          <ToolbarButton active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="چپ‌چین">
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="وسط">
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="راست‌چین">
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="تمام‌عرض">
            <AlignJustify className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarSeparator />
          <ToolbarSwatchMenu
            title="رنگ متن"
            colors={ARTICLE_TEXT_COLOR_SWATCHES}
            activeTone={(editor.getAttributes('articleTextColor').tone as string | undefined) ?? ''}
            onPick={(value) => {
              if (!value) editor.chain().focus().unsetArticleTextColor().run();
              else editor.chain().focus().unsetColor().setArticleTextColor(value).run();
            }}
          >
            <Palette className="h-4 w-4" />
          </ToolbarSwatchMenu>
          <ToolbarSwatchMenu
            title="رنگ پس‌زمینه متن"
            colors={ARTICLE_HIGHLIGHT_SWATCHES}
            activeTone={(editor.getAttributes('articleHighlight').tone as string | undefined) ?? ''}
            onPick={(value) => {
              if (!value) editor.chain().focus().unsetArticleHighlight().run();
              else editor.chain().focus().unsetHighlight().setArticleHighlight(value).run();
            }}
          >
            <Highlighter className="h-4 w-4" />
          </ToolbarSwatchMenu>
          <ToolbarSeparator />
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
          <ToolbarSeparator />
          <ToolbarButton disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} title="بازگشت">
            <Undo2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} title="از نو">
            <Redo2 className="h-4 w-4" />
          </ToolbarButton>
        </ToolbarRow>
      ) : null;

    const toolbarChrome = (
      <>
        <div className="flex items-center justify-between gap-2 border-b border-border px-2 py-1.5 sm:hidden">
          {mode === 'html' ? (
            <p className="min-w-0 truncate text-caption text-text-muted">ویرایش مستقیم HTML</p>
          ) : (
            <span className="text-caption font-semibold text-text-muted">ابزارهای ویرایش</span>
          )}
          <EditorModeToggle mode={mode} onChange={switchMode} />
        </div>

        <div className="hidden sm:block">
          <div className="flex flex-wrap items-center gap-2 px-2 py-1.5">
            {visualToolbarButtons ? (
              <div className="min-w-0 flex-1">{visualToolbarButtons}</div>
            ) : mode === 'html' ? (
              <p className="min-w-0 flex-1 truncate py-1 text-caption text-text-muted">ویرایش مستقیم HTML</p>
            ) : null}
            <EditorModeToggle mode={mode} onChange={switchMode} />
          </div>
        </div>

        {visualToolbarButtons && <div className="px-2 py-1.5 sm:hidden">{visualToolbarButtons}</div>}
      </>
    );

    return (
      <div
        className={cn(
          'article-editor-toolbar shrink-0 border-b border-border bg-surface shadow-sm',
          focusMode ? 'article-editor-toolbar--focus' : 'rounded-t-lg',
        )}
      >
        {toolbarChrome}
      </div>
    );
  }, [editor, editorTick, mode, openLinkEditor, removeLink, switchMode, aiPrompt, handleVideoToolbar, handleTableToolbar, focusMode]);

  return (
    <ArticleVideoEditContext.Provider value={videoEditContextValue}>
    <div className="min-w-0">
      <label className="field-label">{label}</label>
      <div
        className={cn(
          'article-editor-shell min-w-0 rounded-lg border border-border bg-surface',
          focusMode && 'article-editor-shell--focus',
        )}
      >
        {toolbar}
        <div className="article-editor-body relative z-0 min-h-[20rem] rounded-b-lg bg-surface">
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
        onSelect={(src, label, meta) => {
          insertArticleImage(meta?.persistSrc || src, label, meta?.width, meta?.height);
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
        .article-editor-visual h1 {
          font-size: 1.75rem;
          font-weight: 800;
          color: #064c45;
          margin: 1.5rem 0 0.875rem;
        }
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
        .article-editor-visual h4 {
          font-size: 1rem;
          font-weight: 700;
          color: #064c45;
          margin: 0.875rem 0 0.5rem;
        }
        .article-editor-visual h5 {
          font-size: 0.9375rem;
          font-weight: 700;
          color: #064c45;
          margin: 0.75rem 0 0.375rem;
        }
        .article-editor-visual h6 {
          font-size: 0.875rem;
          font-weight: 700;
          color: #64748b;
          margin: 0.75rem 0 0.375rem;
        }
        .article-editor-visual code {
          border-radius: 0.25rem;
          background: rgba(15, 23, 42, 0.08);
          padding: 0.125rem 0.375rem;
          font-family: inherit;
          font-size: 0.875em;
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
          font-family: inherit;
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
