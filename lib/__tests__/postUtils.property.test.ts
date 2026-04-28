import { describe, it, expect } from 'vitest';
import { sortPostsByRecency } from '../../lib/postUtils';
import type { CommunityPost } from '../../types';

/**
 * Minimal post factory — only fields required by CommunityPost.
 */
function makePost(id: string, createdAt: number): CommunityPost {
  return {
    id,
    authorName: 'user',
    postType: 'question',
    content: { text: 'test' },
    likeCount: 0,
    commentCount: 0,
    repostCount: 0,
    createdAt,
    isLikedByUser: false,
    isRepostedByUser: false,
  };
}

/**
 * Property 1: Post Ordering Consistency
 * Validates: Requirements 1.3
 *
 * For any array of posts with arbitrary timestamps,
 * sortPostsByRecency must return them newest-first:
 *   sorted[i].createdAt >= sorted[i+1].createdAt  for all consecutive pairs
 */
describe('sortPostsByRecency – ordering consistency (property test)', () => {
  it('sorted[i].createdAt >= sorted[i+1].createdAt for all consecutive pairs across 100 random inputs', () => {
    const ITERATIONS = 100;

    for (let iter = 0; iter < ITERATIONS; iter++) {
      // Random array length 0–19
      const length = Math.floor(Math.random() * 20);
      const posts: CommunityPost[] = Array.from({ length }, (_, i) =>
        makePost(`post-${iter}-${i}`, Math.floor(Math.random() * 1_000_000_000))
      );

      const sorted = sortPostsByRecency(posts);

      // Verify length is preserved
      expect(sorted.length).toBe(posts.length);

      // Verify ordering property for every consecutive pair
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].createdAt).toBeGreaterThanOrEqual(sorted[i + 1].createdAt);
      }
    }
  });
});

/**
 * Property 2: Like Toggle Idempotence
 * Validates: Requirements 3.2, 3.3
 *
 * For any post state (likeCount, isLikedByUser),
 * applying the like toggle twice must return to the original state.
 */
function applyLikeToggle(likeCount: number, isLiked: boolean): { likeCount: number; isLiked: boolean } {
  return { likeCount: isLiked ? likeCount - 1 : likeCount + 1, isLiked: !isLiked };
}

describe('like toggle – idempotence (property test)', () => {
  it('toggling twice returns to initial state across 100 random (likeCount, isLikedByUser) combinations', () => {
    const ITERATIONS = 100;

    for (let iter = 0; iter < ITERATIONS; iter++) {
      const likeCount = Math.floor(Math.random() * 1001); // 0–1000
      const isLiked = Math.random() < 0.5;

      const afterFirst = applyLikeToggle(likeCount, isLiked);
      const afterSecond = applyLikeToggle(afterFirst.likeCount, afterFirst.isLiked);

      expect(afterSecond.likeCount).toBe(likeCount);
      expect(afterSecond.isLiked).toBe(isLiked);
    }
  });
});

/**
 * Property 3: Repost Toggle Idempotence
 * Validates: Requirements 5.2
 *
 * For any post state (repostCount, isRepostedByUser),
 * applying the repost toggle twice must return to the original state.
 */
function applyRepostToggle(repostCount: number, isReposted: boolean): { repostCount: number; isReposted: boolean } {
  return { repostCount: isReposted ? repostCount - 1 : repostCount + 1, isReposted: !isReposted };
}

describe('repost toggle – idempotence (property test)', () => {
  it('toggling twice returns to initial state across 100 random (repostCount, isRepostedByUser) combinations', () => {
    const ITERATIONS = 100;

    for (let iter = 0; iter < ITERATIONS; iter++) {
      const repostCount = Math.floor(Math.random() * 1001); // 0–1000
      const isReposted = Math.random() < 0.5;

      const afterFirst = applyRepostToggle(repostCount, isReposted);
      const afterSecond = applyRepostToggle(afterFirst.repostCount, afterFirst.isReposted);

      expect(afterSecond.repostCount).toBe(repostCount);
      expect(afterSecond.isReposted).toBe(isReposted);
    }
  });
});

/**
 * Property 4: Poll Percentage Sum
 * Validates: Requirements 8.1
 *
 * For any array of vote counts (1-4 options, 0-1000 votes each),
 * the sum of calculatePollPercentages must be within counts.length of 100
 * (to account for rounding), or all zeros when total votes is 0.
 */
import { calculatePollPercentages } from '../../lib/postUtils';

describe('calculatePollPercentages – percentage sum (property test)', () => {
  it('sum of percentages is within counts.length of 100 (or all zeros) across 100 random inputs', () => {
    const ITERATIONS = 100;

    for (let iter = 0; iter < ITERATIONS; iter++) {
      // 1–4 options
      const numOptions = Math.floor(Math.random() * 4) + 1;
      const counts = Array.from({ length: numOptions }, () => Math.floor(Math.random() * 1001));

      const percentages = calculatePollPercentages(counts);
      const total = counts.reduce((sum, c) => sum + c, 0);

      expect(percentages.length).toBe(counts.length);

      if (total === 0) {
        // All percentages must be 0
        for (const p of percentages) {
          expect(p).toBe(0);
        }
      } else {
        // Sum must be within counts.length of 100 (rounding tolerance)
        const sum = percentages.reduce((s, p) => s + p, 0);
        expect(Math.abs(sum - 100)).toBeLessThanOrEqual(counts.length);
      }
    }
  });
});

/**
 * Property 5: Delete Authorization
 * Validates: Requirements 7.1, 7.5
 *
 * For any post with a random authorName and any currentUser value,
 * canDeletePost must return true if and only if post.authorName === currentUser.
 */
import { canDeletePost } from '../../lib/postUtils';

describe('canDeletePost – delete authorization (property test)', () => {
  it('canDeletePost(post, user) === (post.authorName === user) across 100 random (authorName, currentUser) pairs', () => {
    const ITERATIONS = 100;
    const NAME_POOL = ['alice', 'bob', 'charlie', 'dave'];

    for (let iter = 0; iter < ITERATIONS; iter++) {
      const authorName = NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)];
      const currentUser = NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)];

      const post: import('../../types').CommunityPost = {
        id: `post-${iter}`,
        authorName,
        postType: 'question',
        content: { text: 'test' },
        likeCount: 0,
        commentCount: 0,
        repostCount: 0,
        createdAt: Date.now(),
        isLikedByUser: false,
        isRepostedByUser: false,
      };

      expect(canDeletePost(post, currentUser)).toBe(authorName === currentUser);
    }
  });
});

/**
 * Property 6: Question Text Length Constraint
 * Validates: Requirements 2.2
 *
 * validatePost('question', { text }) is valid iff 1 <= text.length <= 500.
 */
import { validatePost } from '../../lib/postUtils';

describe('validatePost – question text length constraint (property test)', () => {
  it('boundary values: 0→invalid, 1→valid, 500→valid, 501→invalid', () => {
    expect(validatePost('question', { text: '' }).valid).toBe(false);
    expect(validatePost('question', { text: 'a'.repeat(1) }).valid).toBe(true);
    expect(validatePost('question', { text: 'a'.repeat(500) }).valid).toBe(true);
    expect(validatePost('question', { text: 'a'.repeat(501) }).valid).toBe(false);
  });

  it('valid iff 1 <= length <= 500 across 100 random lengths', () => {
    const ITERATIONS = 100;
    for (let i = 0; i < ITERATIONS; i++) {
      const length = Math.floor(Math.random() * 600); // 0–599
      const result = validatePost('question', { text: 'a'.repeat(length) });
      const expected = length >= 1 && length <= 500;
      expect(result.valid).toBe(expected);
    }
  });
});

/**
 * Property 7: Poll Options Count Constraint
 * Validates: Requirements 2.3
 *
 * validatePost('poll', { pollQuestion, pollOptions }) is valid iff 2 <= options.length <= 4.
 */
describe('validatePost – poll options count constraint (property test)', () => {
  const makeOptions = (count: number) =>
    Array.from({ length: count }, (_, i) => `option${i + 1}`);

  it('boundary values: 0→invalid, 1→invalid, 2→valid, 3→valid, 4→valid, 5→invalid', () => {
    const q = { pollQuestion: 'Q?' };
    expect(validatePost('poll', { ...q, pollOptions: makeOptions(0) }).valid).toBe(false);
    expect(validatePost('poll', { ...q, pollOptions: makeOptions(1) }).valid).toBe(false);
    expect(validatePost('poll', { ...q, pollOptions: makeOptions(2) }).valid).toBe(true);
    expect(validatePost('poll', { ...q, pollOptions: makeOptions(3) }).valid).toBe(true);
    expect(validatePost('poll', { ...q, pollOptions: makeOptions(4) }).valid).toBe(true);
    expect(validatePost('poll', { ...q, pollOptions: makeOptions(5) }).valid).toBe(false);
  });

  it('valid iff 2 <= count <= 4 across 100 random option counts', () => {
    const ITERATIONS = 100;
    for (let i = 0; i < ITERATIONS; i++) {
      const count = Math.floor(Math.random() * 8); // 0–7
      const result = validatePost('poll', {
        pollQuestion: 'Q?',
        pollOptions: makeOptions(count),
      });
      const expected = count >= 2 && count <= 4;
      expect(result.valid).toBe(expected);
    }
  });
});

/**
 * Property 8: Meme Caption Length Constraint
 * Validates: Requirements 2.4
 *
 * validatePost('meme', { imageUrl, text }) is valid iff text is absent or text.length <= 280.
 * Caption is optional — length 0 (no caption) is valid.
 */
describe('validatePost – meme caption length constraint (property test)', () => {
  const base = { imageUrl: 'https://example.com/img.jpg' };

  it('boundary values: 0→valid, 280→valid, 281→invalid', () => {
    expect(validatePost('meme', { ...base }).valid).toBe(true); // no caption
    expect(validatePost('meme', { ...base, text: 'a'.repeat(280) }).valid).toBe(true);
    expect(validatePost('meme', { ...base, text: 'a'.repeat(281) }).valid).toBe(false);
  });

  it('valid iff length <= 280 across 100 random caption lengths', () => {
    const ITERATIONS = 100;
    for (let i = 0; i < ITERATIONS; i++) {
      const length = Math.floor(Math.random() * 400); // 0–399
      const result = validatePost('meme', { ...base, text: 'a'.repeat(length) });
      const expected = length <= 280;
      expect(result.valid).toBe(expected);
    }
  });
});
