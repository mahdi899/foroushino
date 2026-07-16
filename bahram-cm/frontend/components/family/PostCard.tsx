'use client';

import { useCallback, useEffect, useRef, useState, type Dispatch, type PointerEvent as ReactPointerEvent, type SetStateAction } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { EmojiRichText } from '@/components/emoji/EmojiRichText';
import { cn } from '@/lib/cn';
import { familyMotion } from '@/lib/family/motion';
import { ActionCard } from '@/components/family/ActionCard';
import { ArticleBlock } from '@/components/family/blocks/ArticleBlock';
import { ImageAlbumBlock, ImageBlock } from '@/components/family/blocks/ImageBlock';
import { ReplyContextBlock } from '@/components/family/blocks/ReplyContextBlock';
import { VideoBlock } from '@/components/family/blocks/VideoBlock';
import { VoiceBlock } from '@/components/family/blocks/VoiceBlock';
import { CommentThreadPreview } from '@/components/family/CommentThreadPreview';
import { FamilyAuthorAvatar } from '@/components/family/FamilyAuthorAvatar';
import { PostMetaRow } from '@/components/family/PostMetaRow';
import { ReactionBar, type ReactionBarHandle } from '@/components/family/ReactionBar';
import type { FamilyComment } from '@/lib/family/types';
import type { FamilyPost, FamilyPostBlock } from '@/lib/family/types';

const POST_QUICK_REACT_BLOCK_SELECTOR = [
  'a[href]',
  'input',
  'textarea',
  'select',
  'audio',
  '.family-reaction-bar',
  '.family-reaction-btn-wrap',
  '.family-reaction-add',
  '.family-post-bubble__meta-row',
  '.family-post-bubble__comment-zone',
  '.family-action-glass',
  '.family-inline-card',
  '.family-voice',
].join(', ');

const POST_SWIPE_BLOCK_SELECTOR = [
  'a[href]',
  'input',
  'textarea',
  'select',
  'audio',
  '.family-reaction-bar',
  '.family-reaction-btn-wrap',
  '.family-reaction-add',
  '.family-post-bubble__meta-row',
  '.family-action-glass',
  '.family-inline-card',
  '.family-voice',
].join(', ');

const SWIPE_LOCK_PX = 8;
const SWIPE_OPEN_PX = 56;
const SWIPE_MAX_PX = 72;

function canQuickReactFromTarget(target: EventTarget | null, bubble: HTMLElement): boolean {
  if (!(target instanceof Element)) return false;
  if (!bubble.contains(target)) return false;
  return !target.closest(POST_QUICK_REACT_BLOCK_SELECTOR);
}

function canSwipeFromTarget(target: EventTarget | null, bubble: HTMLElement): boolean {
  if (!(target instanceof Element)) return false;
  if (!bubble.contains(target)) return false;
  return !target.closest(POST_SWIPE_BLOCK_SELECTOR);
}

function shouldHideActionPrompt(blocks: FamilyPostBlock[], prompt: string): boolean {
  const normalized = prompt.trim();
  if (!normalized) return true;

  return blocks
    .filter((block) => block.type === 'text' && block.text)
    .some((block) => {
      const text = block.text!.trim();
      return text === normalized || text.includes(normalized) || normalized.includes(text);
    });
}

function renderBlock(block: FamilyPostBlock, postId: number, authorName: string) {
  switch (block.type) {
    case 'text':
      return block.text ? (
        <EmojiRichText
          key={block.id}
          text={block.text}
          emojiSize={22}
          emojiMode="loop"
          className="family-post-bubble__text"
        />
      ) : null;
    case 'audio':
      return block.media ? (
        <VoiceBlock key={block.id} media={block.media} postId={postId} title={`صوت — ${authorName}`} />
      ) : null;
    case 'video':
      return block.media ? <VideoBlock key={block.id} media={block.media} postId={postId} /> : null;
    case 'image':
      return block.media ? <ImageBlock key={block.id} media={block.media} /> : null;
    case 'article_reference':
      return block.article ? <ArticleBlock key={block.id} article={block.article} /> : null;
    default:
      return null;
  }
}

function FeedPostCard({
  post,
  compact,
  hideCommentPreview,
  memberCount,
  isStaff,
  previewMode,
  viewerKey,
  onPreviewInteract,
  onOpenComments,
  commentCount,
  setCommentCount,
  commentPreview,
  setCommentPreview,
  anchorId,
  animateEnter = false,
}: {
  post: FamilyPost;
  compact?: boolean;
  hideCommentPreview: boolean;
  memberCount?: number;
  isStaff?: boolean;
  previewMode: 'guest' | 'join' | null;
  viewerKey: string | number;
  onPreviewInteract?: () => void;
  onOpenComments?: (handlers: { onCommentAdded: (comment: FamilyComment) => void }) => void;
  commentCount: number;
  setCommentCount: Dispatch<SetStateAction<number>>;
  commentPreview: FamilyComment[];
  setCommentPreview: Dispatch<SetStateAction<FamilyComment[]>>;
  anchorId?: string;
  animateEnter?: boolean;
}) {
  const blocks = post.blocks ?? [];
  const actions = post.actions ?? [];
  const imageBlocks = blocks.filter((b) => b.type === 'image' && b.media);
  const otherBlocks = blocks.filter((b) => b.type !== 'image');
  const reduceMotion = useReducedMotion();
  const reactionBarRef = useRef<ReactionBarHandle>(null);
  const swipeRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    axis: 'x' | 'y' | null;
    dx: number;
  } | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const openCommentsPanel = useCallback(() => {
    if (previewMode) {
      onPreviewInteract?.();
      return;
    }
    onOpenComments?.({
      onCommentAdded: (comment) => {
        setCommentCount((c) => c + 1);
        setCommentPreview((prev) => {
          if (prev.some((item) => item.id === comment.id)) return prev;
          return [comment, ...prev].slice(0, 3);
        });
      },
    });
  }, [onOpenComments, onPreviewInteract, previewMode, setCommentCount, setCommentPreview]);

  const handleBubbleDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!canQuickReactFromTarget(event.target, event.currentTarget)) return;
      event.preventDefault();
      if (previewMode) {
        onPreviewInteract?.();
        return;
      }
      reactionBarRef.current?.quickReact('heart', { x: event.clientX, y: event.clientY });
    },
    [onPreviewInteract, previewMode],
  );

  const endSwipe = useCallback(
    (commit: boolean) => {
      const dx = swipeRef.current?.dx ?? 0;
      swipeRef.current = null;
      setSwiping(false);
      setSwipeX(0);
      if (commit && Math.abs(dx) >= SWIPE_OPEN_PX) {
        openCommentsPanel();
      }
    },
    [openCommentsPanel],
  );

  const handleSwipePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (!canSwipeFromTarget(event.target, event.currentTarget)) return;
    swipeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      axis: null,
      dx: 0,
    };
  }, []);

  const handleSwipePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const swipe = swipeRef.current;
    if (!swipe || swipe.pointerId !== event.pointerId) return;

    const dx = event.clientX - swipe.startX;
    const dy = event.clientY - swipe.startY;

    if (swipe.axis == null) {
      if (Math.abs(dx) < SWIPE_LOCK_PX && Math.abs(dy) < SWIPE_LOCK_PX) return;
      swipe.axis = Math.abs(dx) > Math.abs(dy) * 1.15 ? 'x' : 'y';
      if (swipe.axis === 'x') {
        event.currentTarget.setPointerCapture(event.pointerId);
        setSwiping(true);
      }
    }

    if (swipe.axis !== 'x') return;

    event.preventDefault();
    swipe.dx = dx;
    const clamped = Math.max(-SWIPE_MAX_PX, Math.min(SWIPE_MAX_PX, dx));
    setSwipeX(clamped);
  }, []);

  const handleSwipePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const swipe = swipeRef.current;
      if (!swipe || swipe.pointerId !== event.pointerId) return;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      endSwipe(swipe.axis === 'x');
    },
    [endSwipe],
  );

  const handleSwipePointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const swipe = swipeRef.current;
      if (!swipe || swipe.pointerId !== event.pointerId) return;
      endSwipe(false);
    },
    [endSwipe],
  );

  return (
    <motion.article
      id={anchorId}
      className={cn('family-feed-post scroll-mt-3', compact && 'family-feed-post--compact')}
      initial={animateEnter && !reduceMotion ? familyMotion.postEnter(0).initial : false}
      animate={familyMotion.postEnter(0).animate}
      transition={familyMotion.postEnter(0).transition}
    >
      <div
        className={cn(
          'family-post-bubble',
          post.is_important && 'family-post-bubble--important',
          post.is_pinned && 'family-post-bubble--pinned',
          swiping && 'family-post-bubble--swiping',
        )}
        style={
          swipeX || swiping
            ? { transform: `translate3d(${swipeX}px, 0, 0)` }
            : undefined
        }
        onDoubleClick={handleBubbleDoubleClick}
        onPointerDown={handleSwipePointerDown}
        onPointerMove={handleSwipePointerMove}
        onPointerUp={handleSwipePointerUp}
        onPointerCancel={handleSwipePointerCancel}
      >
        {(post.is_pinned || post.is_important) && (
          <div className="family-post-bubble__labels">
            {post.is_pinned && (
              <span className="family-post-bubble__badge family-post-bubble__badge--pinned">سنجاق</span>
            )}
            {post.is_important && (
              <span className="family-post-bubble__badge family-post-bubble__badge--important">مهم</span>
            )}
          </div>
        )}

        <div className="family-post-bubble__body">
          {post.reply_context && (
            <ReplyContextBlock
              commentBody={post.reply_context.comment_body}
              userName={post.reply_context.user_name}
            />
          )}
          {otherBlocks.map((b) => renderBlock(b, post.id, post.author.name))}
          {imageBlocks.length === 1 && imageBlocks[0].media ? (
            <ImageBlock media={imageBlocks[0].media} constrained />
          ) : imageBlocks.length > 1 ? (
            <ImageAlbumBlock items={imageBlocks.map((b) => b.media!).filter(Boolean)} constrained />
          ) : null}
        </div>

        {previewMode
          ? null
          : actions.map((action) => (
              <ActionCard
                key={`${viewerKey}-${action.id}`}
                action={action}
                memberCount={memberCount}
                isStaff={isStaff}
                hidePrompt={shouldHideActionPrompt(blocks, action.prompt)}
              />
            ))}

        <div className="family-post-bubble__foot-row" dir="ltr">
          <div className="family-post-bubble__reactions">
            <ReactionBar
              ref={reactionBarRef}
              postId={post.id}
              stats={{ ...post.stats, comments: commentCount }}
              userReaction={post.user_reaction}
              readOnly={Boolean(previewMode)}
              onLockedInteract={onPreviewInteract}
            />
          </div>
          <PostMetaRow
            postId={post.id}
            publishedAt={post.published_at}
            initialViews={post.stats.views ?? 0}
            trackView={!previewMode}
            authorName={post.author.name}
            variant="bubble"
          />
        </div>

        {!hideCommentPreview && (
          <div className="family-post-bubble__comment-zone">
            <CommentThreadPreview
              count={commentCount}
              preview={commentPreview}
              onOpen={openCommentsPanel}
            />
          </div>
        )}
      </div>
    </motion.article>
  );
}

export function PostCard({
  post,
  compact = false,
  variant = 'feed',
  hideCommentPreview = false,
  memberCount,
  isStaff = false,
  previewMode = null,
  viewerKey = 'anon',
  onPreviewInteract,
  onOpenComments,
  anchorId,
  animateEnter = false,
}: {
  post: FamilyPost;
  compact?: boolean;
  variant?: 'feed' | 'modal';
  hideCommentPreview?: boolean;
  memberCount?: number;
  isStaff?: boolean;
  previewMode?: 'guest' | 'join' | null;
  viewerKey?: string | number;
  onPreviewInteract?: () => void;
  onOpenComments?: (handlers: { onCommentAdded: (comment: FamilyComment) => void }) => void;
  anchorId?: string;
  animateEnter?: boolean;
}) {
  const [commentCount, setCommentCount] = useState(post.stats.comments);
  const [commentPreview, setCommentPreview] = useState(post.comment_preview ?? []);

  useEffect(() => {
    setCommentCount(post.stats.comments);
    setCommentPreview(post.comment_preview ?? []);
  }, [post.id, post.stats.comments, post.comment_preview]);

  const blocks = post.blocks ?? [];
  const actions = post.actions ?? [];
  const imageBlocks = blocks.filter((b) => b.type === 'image' && b.media);
  const otherBlocks = blocks.filter((b) => b.type !== 'image');
  const constrainedMedia = variant === 'modal';
  const isFeed = variant === 'feed';

  if (isFeed) {
    return (
      <FeedPostCard
        post={post}
        compact={compact}
        hideCommentPreview={hideCommentPreview}
        memberCount={memberCount}
        isStaff={isStaff}
        previewMode={previewMode}
        viewerKey={viewerKey}
        onPreviewInteract={onPreviewInteract}
        onOpenComments={onOpenComments}
        commentCount={commentCount}
        setCommentCount={setCommentCount}
        commentPreview={commentPreview}
        setCommentPreview={setCommentPreview}
        anchorId={anchorId}
        animateEnter={animateEnter}
      />
    );
  }

  return (
    <article
      className={cn(
        'space-y-3 rounded-2xl p-3.5 sm:p-4 lg:rounded-[18px]',
        compact && 'space-y-2 p-3',
        post.is_important ? 'family-card--important' : 'family-card',
      )}
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <FamilyAuthorAvatar name={post.author.name} avatar={post.author.avatar} size="sm" />
          <span className="text-sm font-semibold text-bone">{post.author.name}</span>
          {post.is_pinned && (
            <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-[11px] text-gold">سنجاق</span>
          )}
          {post.is_important && (
            <span className="shrink-0 rounded-full bg-[color-mix(in_oklab,var(--family-accent)_12%,var(--family-surface-soft))] px-2 py-0.5 text-[11px] text-[var(--family-accent)]">
              مهم
            </span>
          )}
        </div>
      </header>

      <div className="space-y-3">
        {post.reply_context && (
          <ReplyContextBlock
            commentBody={post.reply_context.comment_body}
            userName={post.reply_context.user_name}
          />
        )}
        {otherBlocks.map((b) => renderBlock(b, post.id, post.author.name))}
        {imageBlocks.length === 1 && imageBlocks[0].media ? (
          <ImageBlock media={imageBlocks[0].media} constrained={constrainedMedia} />
        ) : imageBlocks.length > 1 ? (
          <ImageAlbumBlock
            items={imageBlocks.map((b) => b.media!).filter(Boolean)}
            constrained={constrainedMedia}
          />
        ) : null}
      </div>

      {previewMode ? null : actions.map((action) => (
        <ActionCard
          key={`${viewerKey}-${action.id}`}
          action={action}
          memberCount={memberCount}
          isStaff={isStaff}
          hidePrompt={shouldHideActionPrompt(blocks, action.prompt)}
        />
      ))}

      <div className="space-y-2 border-t border-[var(--family-border-subtle)] pt-2.5">
        <div dir="ltr" className="flex items-end justify-between gap-x-2">
          <ReactionBar
            postId={post.id}
            stats={{ ...post.stats, comments: commentCount }}
            userReaction={post.user_reaction}
            readOnly={Boolean(previewMode)}
            onLockedInteract={onPreviewInteract}
          />
          <PostMetaRow
            postId={post.id}
            publishedAt={post.published_at}
            initialViews={post.stats.views ?? 0}
            trackView={!previewMode}
          />
        </div>
      </div>

      {!hideCommentPreview && (
        <CommentThreadPreview
          count={commentCount}
          preview={commentPreview}
          onOpen={() => {
            if (previewMode) {
              onPreviewInteract?.();
              return;
            }
            onOpenComments?.({
              onCommentAdded: (comment) => {
                setCommentCount((c) => c + 1);
                setCommentPreview((prev) => {
                  if (prev.some((item) => item.id === comment.id)) return prev;
                  return [comment, ...prev].slice(0, 3);
                });
              },
            });
          }}
        />
      )}
    </article>
  );
}
