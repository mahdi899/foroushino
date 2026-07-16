import { describe, expect, it } from 'vitest';
import {
  releaseReactionNudge,
  tryClaimReactionNudge,
} from '@/lib/family/reactionNudgeCoordinator';

describe('reactionNudgeCoordinator', () => {
  it('allows only one active nudge post at a time', () => {
    releaseReactionNudge(1);
    releaseReactionNudge(2);

    expect(tryClaimReactionNudge(10)).toBe(true);
    expect(tryClaimReactionNudge(11)).toBe(false);

    releaseReactionNudge(10);
    expect(tryClaimReactionNudge(11)).toBe(true);
  });
});
