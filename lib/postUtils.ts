import type { PostType, CommunityPost } from '../types';

// ─── Post Validation ──────────────────────────────────────────────────────────

export function validatePost(
  postType: PostType,
  content: {
    text?: string;
    imageUrl?: string;
    pollQuestion?: string;
    pollOptions?: string[];
  }
): { valid: boolean; error?: string } {
  if (postType === 'question') {
    if (!content.text || content.text.trim().length === 0) {
      return { valid: false, error: 'Question text is required' };
    }
    if (content.text.length > 500) {
      return { valid: false, error: 'Question must be 500 characters or less' };
    }
  }

  if (postType === 'poll') {
    if (!content.pollQuestion || content.pollQuestion.trim().length === 0) {
      return { valid: false, error: 'Poll question is required' };
    }
    if (!content.pollOptions || content.pollOptions.length < 2 || content.pollOptions.length > 4) {
      return { valid: false, error: 'Poll must have 2-4 options' };
    }
    if (content.pollOptions.some(opt => !opt || opt.trim().length === 0)) {
      return { valid: false, error: 'All poll options must be non-empty' };
    }
  }

  if (postType === 'meme') {
    if (!content.imageUrl || content.imageUrl.trim().length === 0) {
      return { valid: false, error: 'Image URL is required' };
    }
    if (content.text && content.text.length > 280) {
      return { valid: false, error: 'Caption must be 280 characters or less' };
    }
  }

  return { valid: true };
}

// ─── Post Ordering ────────────────────────────────────────────────────────────

export function sortPostsByRecency(posts: CommunityPost[]): CommunityPost[] {
  return [...posts].sort((a, b) => b.createdAt - a.createdAt);
}

// ─── Poll Percentages ─────────────────────────────────────────────────────────

export function calculatePollPercentages(voteCounts: number[]): number[] {
  const total = voteCounts.reduce((sum, count) => sum + count, 0);
  if (total === 0) return voteCounts.map(() => 0);
  return voteCounts.map(count => Math.round((count / total) * 100));
}

// ─── Delete Authorization ─────────────────────────────────────────────────────

export function canDeletePost(post: CommunityPost, currentUser: string): boolean {
  return post.authorName === currentUser;
}

// ─── Relative Time ────────────────────────────────────────────────────────────

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
