/** Only one post in the feed may show the reaction nudge at a time. */
let activePostId: number | null = null;

export function tryClaimReactionNudge(postId: number): boolean {
  if (activePostId !== null && activePostId !== postId) return false;
  activePostId = postId;
  return true;
}

export function releaseReactionNudge(postId: number): void {
  if (activePostId === postId) activePostId = null;
}
