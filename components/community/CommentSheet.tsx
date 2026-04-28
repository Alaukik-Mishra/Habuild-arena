'use client';

import { useState } from 'react';
import type { PostComment } from '../../types';

interface CommentSheetProps {
  postId: string;
  comments: PostComment[];
  currentUser: string;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
}

export default function CommentSheet({
  postId: _postId,
  comments,
  currentUser: _currentUser,
  onClose,
  onSubmit,
}: CommentSheetProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setError('');
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      setText('');
    } catch {
      setError('Failed to post comment. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex flex-col justify-end"
      onClick={onClose}
    >
      {/* Sheet panel */}
      <div
        className="bg-white rounded-t-3xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <h2 className="text-xl font-serif italic font-bold text-gray-900">Comments</h2>
          <button
            onClick={onClose}
            aria-label="Close comments"
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            {/* X icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Comment list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {comments.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">
              No comments yet. Be the first!
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="space-y-0.5">
                <span className="font-bold text-orange-500 text-sm">{comment.authorName}</span>
                <p className="text-gray-800 text-sm leading-relaxed">{comment.text}</p>
              </div>
            ))
          )}
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t border-gray-100 px-4 py-3 space-y-2">
          {error && (
            <p className="text-xs text-red-600 font-medium px-1">{error}</p>
          )}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a comment..."
              className="flex-1 bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 transition-colors"
            />
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || submitting}
              className="bg-orange-500 text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-xl shadow-[0_3px_0_#c2410c] active:shadow-none active:translate-y-0.5 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
