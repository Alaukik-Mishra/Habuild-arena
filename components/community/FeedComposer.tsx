'use client';

import { useState } from 'react';
import { validatePost } from '../../lib/postUtils';
import type { CommunityPost, PostType } from '../../types';

type NewPost = Omit<CommunityPost, 'id' | 'likeCount' | 'commentCount' | 'repostCount' | 'createdAt' | 'isLikedByUser' | 'isRepostedByUser'>;

interface FeedComposerProps {
  currentUser: string;
  onClose: () => void;
  onSubmit: (post: NewPost) => Promise<void>;
}

const TABS: { id: PostType; label: string }[] = [
  { id: 'question', label: 'Question' },
  { id: 'poll',     label: 'Poll' },
  { id: 'meme',     label: 'Meme' },
];

export default function FeedComposer({ currentUser, onClose, onSubmit }: FeedComposerProps) {
  const [activeTab, setActiveTab] = useState<PostType>('question');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Question state
  const [questionText, setQuestionText] = useState('');

  // Poll state
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  // Meme state
  const [imageUrl, setImageUrl] = useState('');
  const [imageSource, setImageSource] = useState<'url' | 'device'>('url');
  const [caption, setCaption] = useState('');

  const handleTabChange = (tab: PostType) => {
    setActiveTab(tab);
    setError('');
  };

  const handleAddOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...pollOptions];
    updated[index] = value;
    setPollOptions(updated);
  };

  const handlePost = async () => {
    if (submitting) return;
    setError('');

    const content =
      activeTab === 'question'
        ? { text: questionText }
        : activeTab === 'poll'
        ? { pollQuestion, pollOptions }
        : { imageUrl, text: caption || undefined };

    const result = validatePost(activeTab, content);
    if (!result.valid) {
      setError(result.error ?? 'Invalid post');
      return;
    }

    setSubmitting(true);
    try {
      const post: NewPost = {
        authorName: currentUser,
        postType: activeTab,
        content,
        userVotedOptionIndex: undefined,
      };
      await onSubmit(post);
      onClose();
    } catch {
      setError('Failed to create post. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex flex-col justify-end"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <h2 className="text-xl font-serif italic font-bold text-gray-900">New Post</h2>
          <button
            onClick={onClose}
            aria-label="Close composer"
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-5 pt-4 pb-2 gap-2 shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                activeTab === tab.id
                  ? 'bg-blue-700 border-blue-700 text-white shadow-[0_3px_0_#1e3a8a]'
                  : 'bg-white border-gray-200 text-gray-500 shadow-[0_3px_0_#e5e7eb] active:shadow-none active:translate-y-0.5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {activeTab === 'question' && (
            <div className="space-y-2">
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                maxLength={500}
                placeholder="Ask the community something..."
                rows={5}
                className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition-colors resize-none"
              />
              <p className={`text-xs text-right font-medium ${questionText.length > 480 ? 'text-red-500' : 'text-gray-400'}`}>
                {questionText.length}/500
              </p>
            </div>
          )}

          {activeTab === 'poll' && (
            <div className="space-y-3">
              <input
                type="text"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Poll question..."
                className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition-colors"
              />
              <div className="space-y-2">
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handleOptionChange(i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                      className="flex-1 bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 transition-colors"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        onClick={() => handleRemoveOption(i)}
                        aria-label={`Remove option ${i + 1}`}
                        className="text-xs font-bold text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {pollOptions.length < 4 && (
                <button
                  onClick={handleAddOption}
                  className="text-sm font-bold text-blue-700 hover:text-blue-900 px-3 py-1.5 rounded-xl hover:bg-blue-50 transition-colors border-2 border-blue-100"
                >
                  + Add Option
                </button>
              )}
            </div>
          )}

          {activeTab === 'meme' && (
            <div className="space-y-3">
              {/* Image source toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setImageSource('url'); setImageUrl(''); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                    imageSource === 'url'
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-white text-gray-500 border-gray-200'
                  }`}
                >
                  🔗 From URL
                </button>
                <button
                  type="button"
                  onClick={() => { setImageSource('device'); setImageUrl(''); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                    imageSource === 'device'
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-white text-gray-500 border-gray-200'
                  }`}
                >
                  📁 From Device
                </button>
              </div>

              {imageSource === 'url' ? (
                <div className="space-y-2">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Paste image URL..."
                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition-colors"
                  />
                  {/* Live preview */}
                  {imageUrl.trim() && (
                    <div className="relative rounded-xl overflow-hidden bg-gray-100 border-2 border-gray-200">
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="max-h-[180px] object-contain w-full"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const el = e.currentTarget.nextElementSibling as HTMLElement | null;
                          if (el) el.style.display = 'flex';
                        }}
                        onLoad={(e) => {
                          e.currentTarget.style.display = 'block';
                          const el = e.currentTarget.nextElementSibling as HTMLElement | null;
                          if (el) el.style.display = 'none';
                        }}
                      />
                      <div className="hidden items-center justify-center py-8 text-gray-400 text-xs font-medium flex-col gap-1">
                        <span className="text-2xl">🚫</span>
                        <span>Can&apos;t load this URL — try a direct image link</span>
                        <span className="text-[10px] text-gray-300">(ends in .jpg, .png, .gif, .webp)</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block w-full cursor-pointer">
                    <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                      imageUrl ? 'border-blue-300 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-50'
                    }`}>
                      {imageUrl ? (
                        <div className="space-y-2">
                          <img src={imageUrl} alt="Preview" className="max-h-[180px] object-contain w-full rounded-lg" />
                          <p className="text-xs text-blue-600 font-bold">Tap to change image</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-3xl">📸</div>
                          <p className="text-sm font-bold text-gray-600">Tap to upload image</p>
                          <p className="text-xs text-gray-400">JPG, PNG, GIF, WEBP</p>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setImageUrl(ev.target?.result as string);
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                </div>
              )}

              <div className="space-y-2">
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={280}
                  placeholder="Caption (optional)..."
                  rows={2}
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition-colors resize-none"
                />
                <p className={`text-xs text-right font-medium ${caption.length > 260 ? 'text-red-500' : 'text-gray-400'}`}>
                  {caption.length}/280
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-100 px-5 py-4 space-y-3">
          {error && (
            <p className="text-xs text-red-600 font-medium">{error}</p>
          )}
          <button
            onClick={handlePost}
            disabled={submitting}
            className="w-full bg-blue-700 text-white text-sm font-bold uppercase tracking-widest py-3.5 rounded-2xl shadow-[0_4px_0_#1e3a8a] active:shadow-none active:translate-y-1 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
          >
            {submitting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
