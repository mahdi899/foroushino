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
import { CommentsSheet } from '@/components/family/CommentsSheet';
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

export function PostCard({ post }: { post: FamilyPost }) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(post.stats.comments);
  const [commentPreview, setCommentPreview] = useState(post.comment_preview ?? []);

  const imageBlocks = post.blocks.filter((b) => b.type === 'image' && b.media);
  const otherBlocks = post.blocks.filter((b) => b.type !== 'image');

  return (
    <article
      className={cn(
        'space-y-3 rounded-3xl border p-4',
        post.is_important ? 'border-gold/40 bg-gold/[0.06]' : 'border-white/10 bg-white/[0.03]',
      )}
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/20 text-sm font-bold text-gold">
            ب
          </span>
          <span className="text-sm font-semibold text-bone">{post.author.name}</span>
        </div>
        {post.is_important && (
          <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-medium text-gold">مهم ⭐</span>
        )}
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
          <ImageBlock media={imageBlocks[0].media} />
        ) : imageBlocks.length > 1 ? (
          <ImageAlbumBlock items={imageBlocks.map((b) => b.media!).filter(Boolean)} />
        ) : null}
      </div>

      {post.actions.map((action) => <ActionCard key={action.id} action={action} />)}

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

      <CommentThreadPreview
        count={commentCount}
        preview={commentPreview}
        onOpen={() => setCommentsOpen(true)}
      />

      {commentsOpen && (
        <CommentsSheet
          postId={post.id}
          onClose={() => setCommentsOpen(false)}
          onCommentAdded={(comment) => {
            setCommentCount((c) => c + 1);
            setCommentPreview((prev) => [comment, ...prev].slice(0, 3));
          }}
        />
      )}
    </article>
  );
}
