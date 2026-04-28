# Design Document: Community Feed

## Overview

The Community Feed replaces the Dashboard component as the HOME tab, transforming the app's entry point from a battles-focused view into a social hub. Users can create and interact with three types of posts: Questions (text), Polls (question + 2-4 options), and Memes (image + caption). The existing battles content moves to the Arena tab under a new "Battles" sub-tab.

This design uses Next.js 16, React 19, TypeScript, Tailwind CSS v4, and Supabase for persistence. The UI follows the existing design system: serif-italic headings, 3D tactile buttons with shadow-based depth, and soft rounded containers.

---

## Architecture

### Component Structure

```
CommunityFeed (replaces Dashboard at 'dashboard' screen)
├── Header (app name + coin balance)
├── Create Post Button (fixed, always visible)
├── Feed List (scrollable)
│   └── PostCard (for each post)
│       ├── Post Header (avatar, author, type badge, timestamp)
│       ├── Post Content (question text / poll options / meme image)
│       └── Interaction Bar (like, comment, repost, share, delete)
└── FeedComposer (bottom sheet modal)
    ├── Post Type Tabs (question / poll / meme)
    └── Type-specific Input Fields

CommentSheet (bottom sheet modal)
├── Comment List
└── Comment Input

Arena (modified)
├── Existing Tabs (challenges, friends, chat)
└── NEW: Battles Tab (moved from Dashboard)
```

### Data Model

**New Supabase Tables:**

```sql
-- posts table
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name TEXT NOT NULL,
  post_type TEXT NOT NULL CHECK (post_type IN ('question', 'poll', 'meme')),
  content JSONB NOT NULL, -- { text?, imageUrl?, caption?, pollQuestion?, pollOptions? }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- post_likes table
CREATE TABLE post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_name)
);

-- post_comments table
CREATE TABLE post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- post_reposts table
CREATE TABLE post_reposts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_name)
);

-- post_poll_votes table
CREATE TABLE post_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  option_index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_name)
);
```

**New TypeScript Interfaces (types/index.ts):**

```typescript
export type PostType = 'question' | 'poll' | 'meme';

export interface CommunityPost {
  id: string;
  authorName: string;
  postType: PostType;
  content: {
    text?: string; // question text or meme caption
    imageUrl?: string; // meme image
    pollQuestion?: string;
    pollOptions?: string[]; // 2-4 options
  };
  likeCount: number;
  commentCount: number;
  repostCount: number;
  createdAt: number; // timestamp
  isLikedByUser: boolean;
  isRepostedByUser: boolean;
  userVotedOptionIndex?: number; // for polls
}

export interface PostComment {
  id: string;
  postId: string;
  authorName: string;
  text: string;
  createdAt: number;
}
```

---

## Core Algorithms

### 1. Post Ordering (Reverse-Chronological)

**Input:** Array of `CommunityPost` objects  
**Output:** Sorted array, newest first

```typescript
function sortPostsByRecency(posts: CommunityPost[]): CommunityPost[] {
  return [...posts].sort((a, b) => b.createdAt - a.createdAt);
}
```

**Invariant:** For any two consecutive posts `p[i]` and `p[i+1]`, `p[i].createdAt >= p[i+1].createdAt`.

---

### 2. Like Toggle (Optimistic Update)

**Input:** `postId`, `currentUser`, current like state  
**Output:** Updated like count and user state

```typescript
async function toggleLike(
  postId: string,
  userName: string,
  isLiked: boolean
): Promise<{ newLikeCount: number; newIsLiked: boolean }> {
  const newIsLiked = !isLiked;
  const delta = newIsLiked ? 1 : -1;
  
  // Optimistic UI update
  const newLikeCount = currentLikeCount + delta;
  
  // Persist to Supabase
  if (newIsLiked) {
    await supabase.from('post_likes').insert({ post_id: postId, user_name: userName });
  } else {
    await supabase.from('post_likes').delete()
      .eq('post_id', postId)
      .eq('user_name', userName);
  }
  
  return { newLikeCount, newIsLiked };
}
```

**Invariant:** Like state is idempotent — toggling twice returns to original state.

---

### 3. Repost Toggle (Same as Like)

**Input:** `postId`, `currentUser`, current repost state  
**Output:** Updated repost count and user state

```typescript
async function toggleRepost(
  postId: string,
  userName: string,
  isReposted: boolean
): Promise<{ newRepostCount: number; newIsReposted: boolean }> {
  const newIsReposted = !isReposted;
  const delta = newIsReposted ? 1 : -1;
  
  const newRepostCount = currentRepostCount + delta;
  
  if (newIsReposted) {
    await supabase.from('post_reposts').insert({ post_id: postId, user_name: userName });
  } else {
    await supabase.from('post_reposts').delete()
      .eq('post_id', postId)
      .eq('user_name', userName);
  }
  
  return { newRepostCount, newIsReposted };
}
```

**Invariant:** Repost state is idempotent — toggling twice returns to original state.

---

### 4. Poll Vote Percentage Calculation

**Input:** Array of vote counts per option  
**Output:** Array of percentages (0-100)

```typescript
function calculatePollPercentages(voteCounts: number[]): number[] {
  const total = voteCounts.reduce((sum, count) => sum + count, 0);
  if (total === 0) return voteCounts.map(() => 0);
  
  return voteCounts.map(count => Math.round((count / total) * 100));
}
```

**Invariant:** Sum of percentages should be approximately 100 (within rounding error).

---

### 5. Post Validation

**Input:** Post type and content fields  
**Output:** Boolean (valid/invalid) + error message

```typescript
function validatePost(
  postType: PostType,
  content: { text?: string; imageUrl?: string; pollQuestion?: string; pollOptions?: string[] }
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
```

**Invariants:**
- Question text: 1-500 characters
- Poll options: 2-4 non-empty strings
- Meme caption: 0-280 characters

---

### 6. Delete Authorization

**Input:** `post`, `currentUser`  
**Output:** Boolean (can delete)

```typescript
function canDeletePost(post: CommunityPost, currentUser: string): boolean {
  return post.authorName === currentUser;
}
```

**Invariant:** Delete option visible iff `post.authorName === currentUser`.

---

## Database Operations (lib/db.ts)

### New Functions

```typescript
// Fetch all posts with user-specific like/repost/vote state
export async function getPosts(userName: string): Promise<CommunityPost[]>;

// Create a new post
export async function createPost(post: Omit<CommunityPost, 'id' | 'likeCount' | 'commentCount' | 'repostCount' | 'createdAt' | 'isLikedByUser' | 'isRepostedByUser'>): Promise<string>;

// Delete a post (authorization checked in component)
export async function deletePost(postId: string): Promise<void>;

// Toggle like
export async function toggleLike(postId: string, userName: string, isLiked: boolean): Promise<void>;

// Add comment
export async function addComment(postId: string, authorName: string, text: string): Promise<PostComment>;

// Get comments for a post
export async function getComments(postId: string): Promise<PostComment[]>;

// Toggle repost
export async function toggleRepost(postId: string, userName: string, isReposted: boolean): Promise<void>;

// Cast poll vote
export async function castPollVote(postId: string, userName: string, optionIndex: number): Promise<void>;
```

---

## UI/UX Flow

### Creating a Post

1. User taps "Create Post" button (fixed at top of feed)
2. Bottom sheet opens with three tabs: Question, Poll, Meme
3. User selects tab and fills in fields
4. User taps "Post" button
5. Validation runs — if invalid, inline error shown
6. If valid, post is created in Supabase
7. New post prepended to feed (optimistic update)
8. Bottom sheet closes

### Interacting with a Post

**Like:**
- Tap heart icon → toggle like state
- Optimistic UI update (count ±1, icon fill)
- Persist to Supabase
- On failure: revert UI, show toast

**Comment:**
- Tap comment icon → open CommentSheet bottom sheet
- View existing comments
- Type new comment, tap "Post"
- Comment appended to list, persisted to Supabase
- On failure: retain text, show inline error

**Repost:**
- Tap repost icon → toggle repost state
- Optimistic UI update (count ±1, icon color)
- Persist to Supabase
- On failure: revert UI, show toast

**Share:**
- Tap share icon
- If Web Share API available: invoke with post link + text
- Else: copy link to clipboard, show toast

**Delete (own posts only):**
- Tap delete icon (only visible on own posts)
- Confirmation modal: "Delete this post?"
- On confirm: remove from feed, delete from Supabase
- On failure: retain post, show toast

### Voting on a Poll

1. User taps a poll option
2. Vote recorded in Supabase
3. Poll UI updates to show results (percentages, bars)
4. User's chosen option highlighted
5. All options become non-interactive
6. On failure: revert UI, re-enable options

---

## Navigation Changes

### app/page.tsx

**Before:**
```typescript
{currentScreen === 'dashboard' && <Dashboard ... />}
```

**After:**
```typescript
{currentScreen === 'dashboard' && <CommunityFeed user={user} points={points} />}
```

### components/Arena.tsx

**Add a new "Battles" tab:**

```typescript
const [tab, setTab] = useState<'challenges'|'chat'|'friends'|'battles'>('challenges');

// In tab selector:
{(['challenges', 'friends', 'chat', 'battles'] as const).map(t => ...)}

// In tab content:
{tab === 'battles' && (
  <BattlesSection
    battles={battles}
    bets={bets}
    setBets={setBets}
    // ... all props previously passed to Dashboard
  />
)}
```

The `BattlesSection` component is extracted from the current Dashboard battles rendering logic.

---

## Correctness Properties

### Property 1: Post Ordering Consistency
**Statement:** For any list of posts, the rendered order must be reverse-chronological (newest first).

**Formal:** `∀ i ∈ [0, n-2]: posts[i].createdAt >= posts[i+1].createdAt`

**Test Strategy:** Generate random posts with timestamps, verify sorted order.

**Validates:** Requirements 1.3

---

### Property 2: Like Toggle Idempotence
**Statement:** Toggling like twice on a post returns to the original state.

**Formal:** `toggleLike(toggleLike(post, user)) = post`

**Test Strategy:** Generate random posts, toggle like twice, verify count and state match original.

**Validates:** Requirements 3.2, 3.3

---

### Property 3: Repost Toggle Idempotence
**Statement:** Toggling repost twice on a post returns to the original state.

**Formal:** `toggleRepost(toggleRepost(post, user)) = post`

**Test Strategy:** Generate random posts, toggle repost twice, verify count and state match original.

**Validates:** Requirements 5.2

---

### Property 4: Poll Percentage Sum
**Statement:** For any poll with votes, the sum of option percentages should be approximately 100 (within rounding error).

**Formal:** `|Σ percentages - 100| <= pollOptions.length`

**Test Strategy:** Generate random vote distributions, calculate percentages, verify sum.

**Validates:** Requirements 8.1

---

### Property 5: Delete Authorization
**Statement:** Delete option is visible if and only if the post author matches the current user.

**Formal:** `canDelete(post, user) ⟺ post.authorName === user.name`

**Test Strategy:** Generate posts with various authors, verify delete visibility for different users.

**Validates:** Requirements 7.1, 7.5

---

### Property 6: Question Text Length Constraint
**Statement:** Question posts must have text between 1 and 500 characters.

**Formal:** `postType === 'question' ⟹ 1 <= content.text.length <= 500`

**Test Strategy:** Generate question posts with various text lengths, verify validation.

**Validates:** Requirements 2.2

---

### Property 7: Poll Options Count Constraint
**Statement:** Poll posts must have between 2 and 4 options.

**Formal:** `postType === 'poll' ⟹ 2 <= content.pollOptions.length <= 4`

**Test Strategy:** Generate poll posts with various option counts, verify validation.

**Validates:** Requirements 2.3

---

### Property 8: Meme Caption Length Constraint
**Statement:** Meme posts with captions must have caption length ≤ 280 characters.

**Formal:** `postType === 'meme' ∧ content.text ≠ undefined ⟹ content.text.length <= 280`

**Test Strategy:** Generate meme posts with various caption lengths, verify validation.

**Validates:** Requirements 2.4

---

## Error Handling

### Network Failures

**Fetch Posts Failure:**
- Display most recently cached posts
- Show non-blocking error banner at top: "Couldn't load new posts. Showing cached content."
- Retry button in banner

**Create Post Failure:**
- Remove optimistic post from feed
- Show toast: "Failed to create post. Try again."
- Retain composer with filled fields

**Like/Repost Toggle Failure:**
- Revert optimistic UI update
- Show toast: "Action failed. Try again."

**Comment Submission Failure:**
- Retain typed text in input
- Show inline error below input: "Failed to post comment. Try again."

**Delete Post Failure:**
- Retain post in feed
- Show toast: "Failed to delete post. Try again."

**Poll Vote Failure:**
- Revert optimistic UI update
- Re-enable poll options
- Show toast: "Vote failed. Try again."

### Edge Cases

**Broken Meme Image:**
- Display placeholder with gray background
- Show caption text if available
- Show "Image unavailable" message

**Empty Feed:**
- Display empty state: "No posts yet. Be the first to share!"
- Prominent "Create Post" button

**Slow Network:**
- Show loading spinner on initial fetch
- Show skeleton cards while loading
- Timeout after 10 seconds, show cached content

---

## Design System Consistency

All components follow the existing design patterns:

**Headings:** `font-serif italic font-bold`

**Buttons:** 3D tactile style
```css
shadow-[0_4px_0_#color]
active:shadow-none
active:translate-y-1
```

**Containers:** Soft rounded cards
```css
bg-white
border-2 border-gray-100
rounded-2xl
shadow-sm
```

**Colors:**
- Primary: `blue-700`
- Success: `green-600`
- Warning: `yellow-600`
- Error: `red-600`
- Text: `gray-900`
- Muted: `gray-400`

---

## Performance Considerations

**Lazy Loading:**
- Implement virtual scrolling for feed (react-window or similar)
- Load posts in batches of 20

**Image Optimization:**
- Use Next.js Image component for meme images
- Lazy load images below fold
- Max height 300px, maintain aspect ratio

**Optimistic Updates:**
- All interactions (like, repost, comment, vote) use optimistic updates
- Revert on failure with clear error messaging

**Caching:**
- Cache posts in React state
- Persist to localStorage for offline viewing
- Refresh on pull-to-refresh gesture

---

## Testing Strategy

**Unit Tests:**
- Post validation logic
- Poll percentage calculation
- Delete authorization logic
- Post sorting algorithm

**Integration Tests:**
- Create post flow (all three types)
- Like/repost toggle with Supabase
- Comment submission
- Poll voting
- Post deletion

**Property-Based Tests:**
- Post ordering consistency (Property 1)
- Like toggle idempotence (Property 2)
- Repost toggle idempotence (Property 3)
- Poll percentage sum (Property 4)
- Delete authorization (Property 5)
- Text length constraints (Properties 6, 7, 8)

**E2E Tests:**
- Full user journey: login → view feed → create post → interact → logout
- Navigation: HOME tab → feed, ARENA tab → battles

---

## Migration Notes

**Existing Dashboard Component:**
- Rename to `BattlesSection` or extract battles logic
- Move to Arena tab as "Battles" sub-tab
- Remove from app/page.tsx 'dashboard' screen

**Arena Component:**
- Add "Battles" tab to existing tab selector
- Pass battles props from app/page.tsx
- Render BattlesSection in battles tab

**BottomNav:**
- No changes needed — HOME tab already points to 'dashboard'

**Types:**
- Add `CommunityPost`, `PostComment`, `PostType` to types/index.ts
- No changes to `AppScreen` type

---

## Future Enhancements (Out of Scope)

- Post editing
- Comment replies (nested comments)
- Post bookmarking
- User mentions (@username)
- Hashtags (#fitness)
- Image upload (currently URL-only)
- Video posts
- Post reactions beyond like (love, laugh, etc.)
- Feed filtering (by post type, by author)
- Trending posts algorithm
