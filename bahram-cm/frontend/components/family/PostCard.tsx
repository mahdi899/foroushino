'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { ActionCard } from '@/components/family/ActionCard';
import { ArticleBlock } from '@/components/family/blocks/ArticleBlock';
import { ImageAlbumBlock, ImageBlock } from '@/components/family/blocks/ImageBlock';
import { ReplyContextBlock } from '@/components/family/blocks/ReplyContextBlock';
import { VideoBlock } from '@/components/family/blocks/VideoBlock';
import { VoiceBlock } from '@/components/family/blocks/VoiceBlock';
import { CommentThreadPreview } from '@/components/family/CommentThreadPreview';
import { FamilyAuthorAvatar } from '@/components/family/FamilyAuthorAvatar';
import type { FamilyComment } from '@/lib/family/types';
import { formatPostDateTime } from '@/lib/family/datetime';
import { ReactionBar } from '@/components/family/ReactionBar';
import type { FamilyPost, FamilyPostBlock } from '@/lib/family/types';

function renderBlock(block: FamilyPostBlock, postId: number) {
  switch (block.type) {
    case 'text':
      return block.text ? (
        <p key={block.id} className="whitespace-pre-wrap text-[15px] leading-7 text-bone/90">
          {block.text}
        </p>
      ) : null;
    case 'audio':
      return block.media ? <VoiceBlock key={block.id} media={block.media} postId={postId} /> : null;
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

export function PostCard({
  post,
  compact = false,
  variant = 'feed',
  hideCommentPreview = false,
  onOpenComments,
}: {
  post: FamilyPost;
  compact?: boolean;
  variant?: 'feed' | 'modal';
  hideCommentPreview?: boolean;
  onOpenComments?: (handlers: { onCommentAdded: (comment: FamilyComment) => void }) => void;
}) {
  const [commentCount, setCommentCount] = useState(post.stats.comments);
  const [commentPreview, setCommentPreview] = useState(post.comment_preview ?? []);

  const blocks = post.blocks ?? [];
  const actions = post.actions ?? [];
  const imageBlocks = blocks.filter((b) => b.type === 'image' && b.media);
  const otherBlocks = blocks.filter((b) => b.type !== 'image');
  const constrainedMedia = variant === 'modal';

  return (
    <article
      className={cn(
        'space-y-3 rounded-2xl p-3.5 sm:p-4 lg:rounded-[18px]',
        compact && 'space-y-2 p-3',
        post.is_important ? 'family-card--important' : 'family-card',
      )}
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FamilyAuthorAvatar name={post.author.name} avatar={post.author.avatar} size="sm" />
          <span className="text-sm font-semibold text-bone">{post.author.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {post.is_pinned && (
            <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-medium text-gold">سنجاق 📌</span>
          )}
          {post.is_important && (
            <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-medium text-gold">مهم ⭐</span>
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
        {otherBlocks.map((b) => renderBlock(b, post.id))}
        {imageBlocks.length === 1 && imageBlocks[0].media ? (
          <ImageBlock media={imageBlocks[0].media} constrained={constrainedMedia} />
        ) : imageBlocks.length > 1 ? (
          <ImageAlbumBlock
            items={imageBlocks.map((b) => b.media!).filter(Boolean)}
            constrained={constrainedMedia}
          />
        ) : null}
      </div>

      {actions.map((action) => <ActionCard key={action.id} action={action} />)}

      <div className="space-y-2 border-t border-[var(--family-border-subtle)] pt-2.5">
        {post.published_at && (
          <time dateTime={post.published_at} className="block text-[11px] tabular-nums text-bone/40">
            {formatPostDateTime(post.published_at)}
          </time>
        )}
        <ReactionBar
          postId={post.id}
          stats={{
            fire: post.stats.fire,
            heart: post.stats.heart,
            target: post.stats.target,
            clap: post.stats.clap,
            comments: commentCount,
            action_responses: post.stats.action_responses,
          }}
          userReaction={post.user_reaction}
        />
      </div>

      {!hideCommentPreview && (
        <CommentThreadPreview
          count={commentCount}
          preview={commentPreview}
          onOpen={() =>
            onOpenComments?.({
              onCommentAdded: (comment) => {
                setCommentCount((c) => c + 1);
                setCommentPreview((prev) => {
                  if (prev.some((item) => item.id === comment.id)) return prev;
                  return [comment, ...prev].slice(0, 3);
                });
              },
            })
          }
        />
      )}

    </article>
  );
}
