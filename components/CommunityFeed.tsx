'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getPosts,
  createPost,
  deletePost,
  toggleLike,
  addComment,
  getComments,
  toggleRepost,
  castPostPollVote,
} from '../lib/db';
import { sortPostsByRecency } from '../lib/postUtils';
import PostCard from './community/PostCard';
import FeedComposer from './community/FeedComposer';
import CommentSheet from './community/CommentSheet';
import type { UserProfile, CommunityPost, PostComment } from '../types';

interface Props {
  user: UserProfile;
  points: number;
}

interface Toast {
  id: number;
  message: string;
}

let toastCounter = 0;

export default function CommunityFeed({ user, points }: Props) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState(false);

  // Composer
  const [composerOpen, setComposerOpen] = useState(false);

  // Comment sheet
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);

  // Delete confirmation
  const [deletePostId, setDeletePostId] = useState<string | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Poll vote counts: Map<postId, number[]>
  const [pollVoteCounts, setPollVoteCounts] = useState<Map<string, number[]>>(new Map());

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const showToast = useCallback((message: string) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  // ─── Load posts ─────────────────────────────────────────────────────────────

  const loadPosts = useCallback(async () => {
    try {
      const fetched = await getPosts(user.name);
      setPosts(fetched);
      setErrorBanner(false);

      // Initialise poll vote counts from actual post data
      const newMap = new Map<string, number[]>();
      for (const post of fetched) {
        if (post.postType === 'poll' && post.content.pollOptions) {
          // We don't have per-option counts from DB, keep zeros as placeholder
          // Real counts come from castPostPollVote optimistic updates
          newMap.set(post.id, post.content.pollOptions.map(() => 0));
        }
      }
      setPollVoteCounts(prev => {
        // Preserve any existing vote counts (from optimistic updates), only add new posts
        const next = new Map(prev);
        for (const [id, counts] of newMap) {
          if (!next.has(id)) next.set(id, counts);
        }
        return next;
      });
    } catch {
      setErrorBanner(true);
    } finally {
      setLoading(false);
    }
  }, [user.name]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // ─── Create post ─────────────────────────────────────────────────────────────

  const handleComposerSubmit = useCallback(
    async (
      newPost: Omit<
        CommunityPost,
        'id' | 'likeCount' | 'commentCount' | 'repostCount' | 'createdAt' | 'isLikedByUser' | 'isRepostedByUser'
      >
    ) => {
      const optimisticId = `optimistic-${Date.now()}`;
      const optimistic: CommunityPost = {
        ...newPost,
        id: optimisticId,
        likeCount: 0,
        commentCount: 0,
        repostCount: 0,
        createdAt: Date.now(),
        isLikedByUser: false,
        isRepostedByUser: false,
      };

      setPosts((prev) => [optimistic, ...prev]);
      setComposerOpen(false);

      try {
        const realId = await createPost(newPost);
        setPosts((prev) =>
          prev.map((p) => (p.id === optimisticId ? { ...p, id: realId } : p))
        );
        // Init poll vote counts for new poll post
        if (newPost.postType === 'poll' && newPost.content.pollOptions) {
          setPollVoteCounts((prev) => {
            const next = new Map(prev);
            next.set(realId, newPost.content.pollOptions!.map(() => 0));
            return next;
          });
        }
      } catch {
        setPosts((prev) => prev.filter((p) => p.id !== optimisticId));
        showToast('Failed to create post. Try again.');
        throw new Error('createPost failed');
      }
    },
    [showToast]
  );

  // ─── Like ────────────────────────────────────────────────────────────────────

  const handleLike = useCallback(
    async (postId: string) => {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      const wasLiked = post.isLikedByUser;
      const delta = wasLiked ? -1 : 1;

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, isLikedByUser: !wasLiked, likeCount: p.likeCount + delta }
            : p
        )
      );

      try {
        await toggleLike(postId, user.name, wasLiked);
      } catch {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, isLikedByUser: wasLiked, likeCount: p.likeCount - delta }
              : p
          )
        );
        showToast('Action failed. Try again.');
      }
    },
    [posts, user.name, showToast]
  );

  // ─── Comment ─────────────────────────────────────────────────────────────────

  const handleOpenComment = useCallback(
    async (postId: string) => {
      setCommentPostId(postId);
      setComments([]);
      try {
        const fetched = await getComments(postId);
        setComments(fetched);
      } catch {
        // show empty, non-blocking
      }
    },
    []
  );

  const handleCommentSubmit = useCallback(
    async (text: string) => {
      if (!commentPostId) return;
      const comment = await addComment(commentPostId, user.name, text);
      setComments((prev) => [...prev, comment]);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === commentPostId ? { ...p, commentCount: p.commentCount + 1 } : p
        )
      );
    },
    [commentPostId, user.name]
  );

  // ─── Repost ──────────────────────────────────────────────────────────────────

  const handleRepost = useCallback(
    async (postId: string) => {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      const wasReposted = post.isRepostedByUser;
      const delta = wasReposted ? -1 : 1;

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, isRepostedByUser: !wasReposted, repostCount: p.repostCount + delta }
            : p
        )
      );

      try {
        await toggleRepost(postId, user.name, wasReposted);
      } catch {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, isRepostedByUser: wasReposted, repostCount: p.repostCount - delta }
              : p
          )
        );
        showToast('Action failed. Try again.');
      }
    },
    [posts, user.name, showToast]
  );

  // ─── Share ───────────────────────────────────────────────────────────────────

  const handleShare = useCallback(
    async (postId: string) => {
      const url = `${window.location.origin}?post=${postId}`;
      if (navigator.share) {
        try {
          await navigator.share({ url, title: 'Check out this post!' });
        } catch {
          // user cancelled — no toast needed
        }
      } else {
        try {
          await navigator.clipboard.writeText(url);
          showToast('Link copied to clipboard!');
        } catch {
          showToast('Could not copy link.');
        }
      }
    },
    [showToast]
  );

  // ─── Delete ──────────────────────────────────────────────────────────────────

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletePostId) return;
    const id = deletePostId;
    setDeletePostId(null);

    const snapshot = posts.find((p) => p.id === id);
    setPosts((prev) => prev.filter((p) => p.id !== id));

    try {
      await deletePost(id);
    } catch {
      if (snapshot) {
        setPosts((prev) => [snapshot, ...prev]);
      }
      showToast('Failed to delete post. Try again.');
    }
  }, [deletePostId, posts, showToast]);

  // ─── Poll vote ───────────────────────────────────────────────────────────────

  const handleVote = useCallback(
    async (postId: string, optionIndex: number) => {
      const post = posts.find((p) => p.id === postId);
      if (!post || post.userVotedOptionIndex !== undefined) return;

      // Optimistic: update post voted state + vote counts
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, userVotedOptionIndex: optionIndex } : p
        )
      );
      setPollVoteCounts((prev) => {
        const next = new Map(prev);
        const current = next.get(postId) ?? (post.content.pollOptions?.map(() => 0) ?? []);
        const updated = current.map((c, i) => (i === optionIndex ? c + 1 : c));
        next.set(postId, updated);
        return next;
      });

      try {
        await castPostPollVote(postId, user.name, optionIndex);
      } catch {
        // Revert
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, userVotedOptionIndex: undefined } : p
          )
        );
        setPollVoteCounts((prev) => {
          const next = new Map(prev);
          const current = next.get(postId) ?? [];
          const reverted = current.map((c, i) => (i === optionIndex ? Math.max(0, c - 1) : c));
          next.set(postId, reverted);
          return next;
        });
        showToast('Vote failed. Try again.');
      }
    },
    [posts, user.name, showToast]
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  const sortedPosts = sortPostsByRecency(posts);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-8 pb-3 shrink-0">
        <h1 className="text-2xl font-serif italic font-bold text-gray-900">Community</h1>
        <div className="bg-yellow-100 border-2 border-yellow-400 text-yellow-700 px-3 py-1.5 rounded-xl font-bold flex items-center shadow-[0_3px_0_#facc15]">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 mr-1">
            <circle cx="12" cy="12" r="10" />
          </svg>
          {points}
        </div>
      </div>

      {/* Error banner */}
      {errorBanner && (
        <div className="mx-5 mb-2 px-4 py-2.5 bg-yellow-50 border-2 border-yellow-200 rounded-xl flex items-center justify-between shrink-0">
          <p className="text-xs font-medium text-yellow-700">Couldn&apos;t load new posts.</p>
          <button onClick={loadPosts} className="text-xs font-bold text-yellow-700 underline ml-2">Retry</button>
        </div>
      )}

      {/* Create Post button */}
      <div className="px-5 pb-3 shrink-0">
        <button
          onClick={() => setComposerOpen(true)}
          className="w-full bg-blue-700 text-white text-sm font-bold uppercase tracking-widest py-3.5 rounded-2xl shadow-[0_4px_0_#1e3a8a] active:shadow-none active:translate-y-1 transition-all"
        >
          + Create Post
        </button>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-5 pb-28 space-y-4">
        {loading ? (
          // Loading skeleton
          <>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white border-2 border-gray-100 rounded-2xl shadow-sm p-4 animate-pulse"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                    <div className="h-2 bg-gray-100 rounded w-1/5" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-4/5" />
                </div>
              </div>
            ))}
          </>
        ) : sortedPosts.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">💬</div>
            <p className="font-bold text-gray-700 text-lg mb-1">No posts yet.</p>
            <p className="text-sm text-gray-400">Be the first to share!</p>
          </div>
        ) : (
          sortedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={user.name}
              onLike={handleLike}
              onComment={handleOpenComment}
              onRepost={handleRepost}
              onShare={handleShare}
              onDelete={(id) => setDeletePostId(id)}
              onVote={handleVote}
              pollVoteCounts={pollVoteCounts.get(post.id)}
            />
          ))
        )}
      </div>

      {/* FeedComposer */}
      {composerOpen && (
        <FeedComposer
          currentUser={user.name}
          onClose={() => setComposerOpen(false)}
          onSubmit={handleComposerSubmit}
        />
      )}

      {/* CommentSheet */}
      {commentPostId && (
        <CommentSheet
          postId={commentPostId}
          comments={comments}
          currentUser={user.name}
          onClose={() => setCommentPostId(null)}
          onSubmit={handleCommentSubmit}
        />
      )}

      {/* Delete confirmation modal */}
      {deletePostId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDeletePostId(null)}
          />
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 relative z-10 shadow-2xl">
            <h3 className="text-xl font-serif italic font-bold text-gray-900 mb-2">
              Delete this post?
            </h3>
            <p className="text-sm text-gray-500 mb-8">This action cannot be undone.</p>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeletePostId(null)}
                className="flex-1 py-3.5 bg-gray-50 text-gray-600 font-bold text-xs uppercase tracking-wider rounded-xl border border-gray-200 shadow-[0_3px_0_#e5e7eb] active:shadow-none active:translate-y-0.5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-3.5 bg-red-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-[0_3px_0_#991b1b] active:shadow-none active:translate-y-0.5 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast stack */}
      {toasts.length > 0 && (
        <div className="fixed bottom-24 left-0 right-0 flex flex-col items-center gap-2 z-50 pointer-events-none px-5">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg"
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
