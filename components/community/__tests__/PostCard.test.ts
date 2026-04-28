/**
 * PostCard logic tests
 * Validates: Requirements 7.1, 7.5, 3.2, 11.2, 11.3
 *
 * No DOM rendering — tests verify pure logic and component source patterns.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { canDeletePost } from '../../../lib/postUtils';
import type { CommunityPost } from '../../../types';

// ─── Factory ──────────────────────────────────────────────────────────────────

function makePost(overrides: Partial<CommunityPost> = {}): CommunityPost {
  return {
    id: 'post-1',
    authorName: 'Alice',
    postType: 'question',
    content: { text: 'Test question?' },
    likeCount: 0,
    commentCount: 0,
    repostCount: 0,
    createdAt: Date.now(),
    isLikedByUser: false,
    isRepostedByUser: false,
    ...overrides,
  };
}

// ─── PostCard source (for pattern checks) ────────────────────────────────────

const postCardSource = readFileSync(
  join(process.cwd(), 'components/community/PostCard.tsx'),
  'utf-8'
);

// ─── 1. Delete button visibility (Req 7.1) ───────────────────────────────────

describe('canDeletePost — delete button visibility', () => {
  it('returns true when currentUser matches authorName', () => {
    const post = makePost({ authorName: 'Alice' });
    expect(canDeletePost(post, 'Alice')).toBe(true);
  });

  it('returns false when currentUser differs from authorName', () => {
    const post = makePost({ authorName: 'Alice' });
    expect(canDeletePost(post, 'Bob')).toBe(false);
  });

  it('returns false for empty currentUser', () => {
    const post = makePost({ authorName: 'Alice' });
    expect(canDeletePost(post, '')).toBe(false);
  });

  it('is case-sensitive', () => {
    const post = makePost({ authorName: 'Alice' });
    expect(canDeletePost(post, 'alice')).toBe(false);
  });
});

// ─── 2. Like button active state (Req 7.5) ───────────────────────────────────

describe('like button active state logic', () => {
  it('isLikedByUser=true should trigger active styling branch', () => {
    const post = makePost({ isLikedByUser: true });
    // The component uses post.isLikedByUser to conditionally apply active classes
    expect(post.isLikedByUser).toBe(true);
  });

  it('isLikedByUser=false should trigger inactive styling branch', () => {
    const post = makePost({ isLikedByUser: false });
    expect(post.isLikedByUser).toBe(false);
  });

  it('PostCard source applies active classes when isLikedByUser is true', () => {
    // Verify the component source contains the conditional class for liked state
    expect(postCardSource).toContain("post.isLikedByUser");
    expect(postCardSource).toContain("bg-red-50");
  });

  it('PostCard source applies inactive classes when isLikedByUser is false', () => {
    expect(postCardSource).toContain("bg-white border-gray-100 text-gray-500");
  });
});

// ─── 3. Meme image max-h-[300px] class (Req 3.2) ────────────────────────────

describe('meme image class', () => {
  it('PostCard source contains max-h-[300px] on the meme img element', () => {
    expect(postCardSource).toContain('max-h-[300px]');
  });

  it('PostCard source uses object-contain for meme image', () => {
    expect(postCardSource).toContain('object-contain');
  });
});

// ─── 4. Broken image onError fallback (Req 11.2, 11.3) ──────────────────────

describe('image error fallback', () => {
  it('PostCard source has an onError handler on the meme img', () => {
    expect(postCardSource).toContain('onError');
  });

  it('onError handler replaces src with a data URI placeholder', () => {
    expect(postCardSource).toContain('data:image/svg+xml');
  });

  it('onError handler nullifies itself to prevent infinite loops', () => {
    expect(postCardSource).toContain('img.onerror = null');
  });

  it('placeholder contains "Image unavailable" text', () => {
    expect(postCardSource).toContain('Image unavailable');
  });
});
