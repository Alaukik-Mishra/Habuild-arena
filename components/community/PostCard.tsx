'use client';

import PollOptions from './PollOptions';
import { canDeletePost, formatRelativeTime } from '../../lib/postUtils';
import type { CommunityPost } from '../../types';

interface PostCardProps {
  post: CommunityPost;
  currentUser: string;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onRepost: (postId: string) => void;
  onShare: (postId: string) => void;
  onDelete: (postId: string) => void;
  onVote: (postId: string, optionIndex: number) => void;
  pollVoteCounts?: number[];
}

const POST_TYPE_BADGE: Record<CommunityPost['postType'], { label: string; className: string }> = {
  question: { label: 'Question', className: 'bg-orange-50 text-orange-500 border-orange-100' },
  poll:     { label: 'Poll',     className: 'bg-purple-50 text-purple-700 border-purple-100' },
  meme:     { label: 'Meme',     className: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function PostCard({
  post,
  currentUser,
  onLike,
  onComment,
  onRepost,
  onShare,
  onDelete,
  onVote,
  pollVoteCounts,
}: PostCardProps) {
  const badge = POST_TYPE_BADGE[post.postType];
  const canDelete = canDeletePost(post, currentUser);

  // Poll vote counts: use provided or default to zeros
  const voteCounts =
    pollVoteCounts ??
    (post.content.pollOptions ? post.content.pollOptions.map(() => 0) : []);

  return (
    <div className="bg-white border-2 border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center space-x-3">
          {/* Initials avatar */}
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-bold text-sm shrink-0">
            {getInitials(post.authorName)}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">{post.authorName}</p>
            <p className="text-[10px] text-gray-400 font-medium">{formatRelativeTime(post.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Post type badge */}
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border ${badge.className}`}>
            {badge.label}
          </span>
          {/* Delete button */}
          {canDelete && (
            <button
              onClick={() => onDelete(post.id)}
              aria-label="Delete post"
              className="w-8 h-8 flex items-center justify-center rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors"
            >
              {/* Trash icon */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        {post.postType === 'question' && (
          <p className="text-gray-900 text-sm leading-relaxed">{post.content.text}</p>
        )}

        {post.postType === 'poll' && (
          <div className="space-y-3">
            <p className="font-bold text-gray-900 text-base leading-snug">{post.content.pollQuestion}</p>
            {post.content.pollOptions && (
              <PollOptions
                options={post.content.pollOptions}
                voteCounts={voteCounts}
                userVotedIndex={post.userVotedOptionIndex}
                onVote={(index) => onVote(post.id, index)}
                disabled={false}
              />
            )}
          </div>
        )}

        {post.postType === 'meme' && (
          <div className="space-y-2">
            <img
              src={post.content.imageUrl}
              alt={post.content.text ?? 'Meme'}
              className="max-h-[300px] object-contain w-full rounded-xl bg-gray-100"
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              onError={(e) => {
                const img = e.currentTarget;
                img.onerror = null;
                // Try without crossOrigin as fallback
                img.removeAttribute('crossorigin');
                img.src = img.src; // force reload without crossOrigin
                img.onerror = () => {
                  img.onerror = null;
                  img.src = 'data:image/svg+xml,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%22400%22 height%3D%22200%22 viewBox%3D%220 0 400 200%22%3E%3Crect width%3D%22400%22 height%3D%22200%22 fill%3D%22%23f3f4f6%22%2F%3E%3Ctext x%3D%22200%22 y%3D%22100%22 font-family%3D%22sans-serif%22 font-size%3D%2214%22 fill%3D%22%239ca3af%22 text-anchor%3D%22middle%22%3EImage unavailable%3C%2Ftext%3E%3Ctext x%3D%22200%22 y%3D%22120%22 font-family%3D%22sans-serif%22 font-size%3D%2211%22 fill%3D%22%23d1d5db%22 text-anchor%3D%22middle%22%3E(link may be blocked)%3C%2Ftext%3E%3C%2Fsvg%3E';
                };
              }}
            />
            {post.content.text && (
              <p className="text-gray-600 text-sm italic">{post.content.text}</p>
            )}
          </div>
        )}
      </div>

      {/* Interaction bar */}
      <div className="flex items-center px-3 pb-3 pt-1 border-t border-gray-50 space-x-1">
        {/* Like */}
        <button
          onClick={() => onLike(post.id)}
          aria-label={post.isLikedByUser ? 'Unlike' : 'Like'}
          className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-[0_3px_0_#e5e7eb] active:shadow-none active:translate-y-0.5 border-2 ${
            post.isLikedByUser
              ? 'bg-red-50 border-red-100 text-red-500 shadow-[0_3px_0_#fecaca]'
              : 'bg-white border-gray-100 text-gray-500'
          }`}
        >
          {/* Heart icon */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill={post.isLikedByUser ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span>{post.likeCount}</span>
        </button>

        {/* Comment */}
        <button
          onClick={() => onComment(post.id)}
          aria-label="Comment"
          className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white border-2 border-gray-100 text-gray-500 transition-all shadow-[0_3px_0_#e5e7eb] active:shadow-none active:translate-y-0.5"
        >
          {/* Comment bubble icon */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>{post.commentCount}</span>
        </button>

        {/* Repost */}
        <button
          onClick={() => onRepost(post.id)}
          aria-label={post.isRepostedByUser ? 'Undo repost' : 'Repost'}
          className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-[0_3px_0_#e5e7eb] active:shadow-none active:translate-y-0.5 border-2 ${
            post.isRepostedByUser
              ? 'bg-green-50 border-green-100 text-green-600 shadow-[0_3px_0_#bbf7d0]'
              : 'bg-white border-gray-100 text-gray-500'
          }`}
        >
          {/* Repost arrows icon */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
          <span>{post.repostCount}</span>
        </button>

        {/* Share */}
        <button
          onClick={() => onShare(post.id)}
          aria-label="Share"
          className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white border-2 border-gray-100 text-gray-500 transition-all shadow-[0_3px_0_#e5e7eb] active:shadow-none active:translate-y-0.5 ml-auto"
        >
          {/* Share icon */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
      </div>
    </div>
  );
}
