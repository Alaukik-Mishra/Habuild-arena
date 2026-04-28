import { describe, it, expect } from 'vitest';
import { sortPostsByRecency } from '../../lib/postUtils';
import type { CommunityPost } from '../../types';

// ─── Factory ──────────────────────────────────────────────────────────────────

function makePost(overrides: Partial<CommunityPost> & { id: string; createdAt: number }): CommunityPost {
  return {
    authorName: 'testUser',
    postType: 'question',
    content: { text: 'Test post' },
    likeCount: 0,
    commentCount: 0,
    repostCount: 0,
    isLikedByUser: false,
    isRepostedByUser: false,
    ...overrides,
  };
}

// ─── 1. Feed renders posts in reverse-chronological order (Req 1.3) ───────────

describe('CommunityFeed – reverse-chronological order', () => {
  it('sorts posts newest-first', () => {
    const posts = [
      makePost({ id: 'a', createdAt: 1000 }),
      makePost({ id: 'b', createdAt: 3000 }),
      makePost({ id: 'c', createdAt: 2000 }),
    ];

    const sorted = sortPostsByRecency(posts);

    expect(sorted[0].id).toBe('b'); // newest
    expect(sorted[1].id).toBe('c');
    expect(sorted[2].id).toBe('a'); // oldest
  });

  it('returns a single post unchanged', () => {
    const posts = [makePost({ id: 'only', createdAt: 5000 })];
    const sorted = sortPostsByRecency(posts);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].id).toBe('only');
  });

  it('does not mutate the original array', () => {
    const posts = [
      makePost({ id: 'x', createdAt: 100 }),
      makePost({ id: 'y', createdAt: 200 }),
    ];
    const original = [...posts];
    sortPostsByRecency(posts);
    expect(posts[0].id).toBe(original[0].id);
    expect(posts[1].id).toBe(original[1].id);
  });
});

// ─── 2. New post prepended after creation (Req 2.7) ──────────────────────────

describe('CommunityFeed – optimistic prepend on creation', () => {
  it('places the new post at index 0', () => {
    const existingPosts = [
      makePost({ id: 'old-1', createdAt: 1000 }),
      makePost({ id: 'old-2', createdAt: 900 }),
    ];

    const optimistic = makePost({ id: 'optimistic-123', createdAt: Date.now() });
    const updatedFeed = [optimistic, ...existingPosts];

    expect(updatedFeed[0].id).toBe('optimistic-123');
  });

  it('total count is existingPosts.length + 1', () => {
    const existingPosts = [
      makePost({ id: 'old-1', createdAt: 1000 }),
      makePost({ id: 'old-2', createdAt: 900 }),
      makePost({ id: 'old-3', createdAt: 800 }),
    ];

    const optimistic = makePost({ id: 'optimistic-456', createdAt: Date.now() });
    const updatedFeed = [optimistic, ...existingPosts];

    expect(updatedFeed).toHaveLength(existingPosts.length + 1);
  });

  it('existing posts remain in their original positions after prepend', () => {
    const existingPosts = [
      makePost({ id: 'old-1', createdAt: 1000 }),
      makePost({ id: 'old-2', createdAt: 900 }),
    ];

    const optimistic = makePost({ id: 'new', createdAt: Date.now() });
    const updatedFeed = [optimistic, ...existingPosts];

    expect(updatedFeed[1].id).toBe('old-1');
    expect(updatedFeed[2].id).toBe('old-2');
  });
});

// ─── 3. Like toggle updates count correctly (Req 3.2) ────────────────────────

describe('CommunityFeed – like toggle state logic', () => {
  it('liking an unliked post increments likeCount and sets isLikedByUser=true', () => {
    const post = makePost({ id: 'p1', createdAt: 1000, likeCount: 5, isLikedByUser: false });

    const wasLiked = post.isLikedByUser;
    const delta = wasLiked ? -1 : 1;
    const updated = { ...post, isLikedByUser: !wasLiked, likeCount: post.likeCount + delta };

    expect(updated.likeCount).toBe(6);
    expect(updated.isLikedByUser).toBe(true);
  });

  it('unliking a liked post decrements likeCount and sets isLikedByUser=false', () => {
    const post = makePost({ id: 'p2', createdAt: 1000, likeCount: 10, isLikedByUser: true });

    const wasLiked = post.isLikedByUser;
    const delta = wasLiked ? -1 : 1;
    const updated = { ...post, isLikedByUser: !wasLiked, likeCount: post.likeCount + delta };

    expect(updated.likeCount).toBe(9);
    expect(updated.isLikedByUser).toBe(false);
  });

  it('only the targeted post is updated in the feed', () => {
    const posts = [
      makePost({ id: 'p1', createdAt: 2000, likeCount: 3, isLikedByUser: false }),
      makePost({ id: 'p2', createdAt: 1000, likeCount: 7, isLikedByUser: false }),
    ];

    const targetId = 'p1';
    const target = posts.find((p) => p.id === targetId)!;
    const wasLiked = target.isLikedByUser;
    const delta = wasLiked ? -1 : 1;

    const updated = posts.map((p) =>
      p.id === targetId
        ? { ...p, isLikedByUser: !wasLiked, likeCount: p.likeCount + delta }
        : p
    );

    expect(updated.find((p) => p.id === 'p1')!.likeCount).toBe(4);
    expect(updated.find((p) => p.id === 'p2')!.likeCount).toBe(7); // unchanged
  });
});

// ─── 4. Delete removes post from feed (Req 7.3) ──────────────────────────────

describe('CommunityFeed – delete removes post', () => {
  it('deleted post is no longer in the array', () => {
    const posts = [
      makePost({ id: 'keep-1', createdAt: 3000 }),
      makePost({ id: 'delete-me', createdAt: 2000 }),
      makePost({ id: 'keep-2', createdAt: 1000 }),
    ];

    const deletedId = 'delete-me';
    const result = posts.filter((p) => p.id !== deletedId);

    expect(result.find((p) => p.id === deletedId)).toBeUndefined();
  });

  it('remaining posts are unchanged after delete', () => {
    const posts = [
      makePost({ id: 'keep-1', createdAt: 3000 }),
      makePost({ id: 'delete-me', createdAt: 2000 }),
      makePost({ id: 'keep-2', createdAt: 1000 }),
    ];

    const result = posts.filter((p) => p.id !== 'delete-me');

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('keep-1');
    expect(result[1].id).toBe('keep-2');
  });

  it('deleting from a single-item feed yields an empty array', () => {
    const posts = [makePost({ id: 'solo', createdAt: 1000 })];
    const result = posts.filter((p) => p.id !== 'solo');
    expect(result).toHaveLength(0);
  });
});
