# Implementation Plan: Community Feed

## Overview

Replace the Dashboard component with a social Community Feed as the HOME tab. Move battles content into the Arena tab. Implement post creation (question/poll/meme), interactions (like/comment/repost/share/delete), and poll voting — all backed by Supabase.

## Tasks

- [x] 1. Add types and database functions
  - [x] 1.1 Add `PostType`, `CommunityPost`, and `PostComment` interfaces to `types/index.ts`
    - Add `PostType = 'question' | 'poll' | 'meme'`
    - Add `CommunityPost` with fields: id, authorName, postType, content (text/imageUrl/pollQuestion/pollOptions), likeCount, commentCount, repostCount, createdAt, isLikedByUser, isRepostedByUser, userVotedOptionIndex
    - Add `PostComment` with fields: id, postId, authorName, text, createdAt
    - _Requirements: 2.1, 11.1_

  - [x] 1.2 Add community feed database functions to `lib/db.ts`
    - Implement `getPosts(userName: string): Promise<CommunityPost[]>` — fetches posts joined with like/repost/vote state for the current user, ordered by `created_at DESC`
    - Implement `createPost(...)` — inserts into `posts` table, returns new post id
    - Implement `deletePost(postId: string)` — deletes from `posts` table (cascades to likes/comments/reposts/votes)
    - Implement `toggleLike(postId, userName, isLiked)` — insert or delete from `post_likes`
    - Implement `addComment(postId, authorName, text)` — insert into `post_comments`, return new `PostComment`
    - Implement `getComments(postId)` — fetch all comments for a post ordered by `created_at ASC`
    - Implement `toggleRepost(postId, userName, isReposted)` — insert or delete from `post_reposts`
    - Implement `castPostPollVote(postId, userName, optionIndex)` — insert into `post_poll_votes`
    - _Requirements: 1.4, 3.4, 4.3, 5.4, 7.3, 8.4_

  - [x] 1.3 Write unit tests for post validation logic
    - Test `validatePost` for question (empty, >500 chars, valid)
    - Test `validatePost` for poll (0 options, 1 option, 5 options, 2-4 valid options)
    - Test `validatePost` for meme (no URL, caption >280 chars, valid)
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

- [x] 2. Implement post validation and core utilities
  - [x] 2.1 Create `lib/postUtils.ts` with pure utility functions
    - Implement `validatePost(postType, content)` returning `{ valid, error? }`
    - Implement `sortPostsByRecency(posts)` returning sorted array newest-first
    - Implement `calculatePollPercentages(voteCounts)` returning percentage array
    - Implement `canDeletePost(post, currentUser)` returning boolean
    - Implement `formatRelativeTime(timestamp)` returning human-readable string (e.g. "2m ago", "3h ago")
    - _Requirements: 1.3, 2.2, 2.3, 2.4, 7.1, 8.1_

  - [x] 2.2 Write property test for post ordering consistency
    - **Property 1: Post Ordering Consistency**
    - **Validates: Requirements 1.3**
    - Generate random arrays of posts with arbitrary timestamps
    - Assert `sortPostsByRecency(posts)[i].createdAt >= sortPostsByRecency(posts)[i+1].createdAt` for all consecutive pairs

  - [x] 2.3 Write property test for like toggle idempotence
    - **Property 2: Like Toggle Idempotence**
    - **Validates: Requirements 3.2, 3.3**
    - Generate random post state (likeCount, isLikedByUser)
    - Apply toggle twice, assert final state equals initial state

  - [x] 2.4 Write property test for repost toggle idempotence
    - **Property 3: Repost Toggle Idempotence**
    - **Validates: Requirements 5.2**
    - Generate random post state (repostCount, isRepostedByUser)
    - Apply toggle twice, assert final state equals initial state

  - [x] 2.5 Write property test for poll percentage sum
    - **Property 4: Poll Percentage Sum**
    - **Validates: Requirements 8.1**
    - Generate random vote count arrays (1-4 options, 0-1000 votes each)
    - Assert `|sum(calculatePollPercentages(counts)) - 100| <= counts.length`

  - [x] 2.6 Write property test for delete authorization
    - **Property 5: Delete Authorization**
    - **Validates: Requirements 7.1, 7.5**
    - Generate random posts with random authorNames and random currentUser values
    - Assert `canDeletePost(post, user) === (post.authorName === user)`

  - [x] 2.7 Write property tests for text length constraints
    - **Property 6: Question Text Length Constraint** — Validates: Requirements 2.2
    - **Property 7: Poll Options Count Constraint** — Validates: Requirements 2.3
    - **Property 8: Meme Caption Length Constraint** — Validates: Requirements 2.4
    - Generate posts at boundary values (0, 1, 280, 281, 499, 500, 501 chars)
    - Assert validation returns correct valid/invalid result at each boundary

- [x] 3. Checkpoint — Ensure all utility tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement `PollOptions` component
  - [x] 4.1 Create `components/community/PollOptions.tsx`
    - Accept props: `options: string[]`, `voteCounts: number[]`, `userVotedIndex?: number`, `onVote: (index: number) => void`, `disabled: boolean`
    - When `userVotedIndex` is undefined and `disabled` is false: render each option as a tappable button (3D tactile style)
    - When `userVotedIndex` is defined: render each option as a result bar showing percentage and vote count; highlight the user's chosen option with `bg-blue-50 border-blue-400`; all options non-interactive
    - Use `calculatePollPercentages` from `lib/postUtils.ts` for percentage display
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 4.2 Write unit tests for PollOptions rendering
    - Test un-voted state renders interactive buttons
    - Test voted state renders result bars with correct percentages
    - Test user's chosen option is highlighted
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 5. Implement `PostCard` component
  - [x] 5.1 Create `components/community/PostCard.tsx`
    - Accept props: `post: CommunityPost`, `currentUser: string`, `onLike`, `onComment`, `onRepost`, `onShare`, `onDelete`, `onVote`
    - Render post header: initials avatar, author name, post type badge (`Question`/`Poll`/`Meme`), relative timestamp using `formatRelativeTime`
    - Render post content based on `postType`:
      - `question`: render `content.text` as body text
      - `poll`: render `content.pollQuestion` as heading, then `<PollOptions>` component
      - `meme`: render `<img>` with `max-h-[300px] object-contain w-full`, fallback to placeholder on `onError`; render `content.text` as caption below
    - Render interaction bar: like button (heart icon, count), comment button (count), repost button (count), share button
    - Render delete button (trash icon) only when `canDeletePost(post, currentUser)` is true
    - Apply design system: `bg-white border-2 border-gray-100 rounded-2xl shadow-sm` container; 3D tactile buttons
    - _Requirements: 3.1, 4.1, 5.1, 6.1, 7.1, 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 5.2 Write unit tests for PostCard
    - Test delete button visible only for own posts
    - Test like button shows correct active/inactive state
    - Test meme image renders with max-h-[300px]
    - Test broken image shows placeholder
    - _Requirements: 7.1, 7.5, 3.2, 11.2, 11.3_

- [x] 6. Implement `CommentSheet` component
  - [x] 6.1 Create `components/community/CommentSheet.tsx`
    - Accept props: `postId: string`, `comments: PostComment[]`, `currentUser: string`, `onClose: () => void`, `onSubmit: (text: string) => Promise<void>`
    - Render as bottom-sheet overlay (`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex flex-col justify-end`)
    - Show comment list: each comment displays author name (bold, `text-blue-700`) and text
    - Show empty state when no comments: "No comments yet. Be the first!"
    - Show text input + "Post" button at bottom
    - On submit: call `onSubmit(text)`, clear input on success; on failure retain text and show inline error "Failed to post comment. Try again."
    - Close on backdrop tap or close button
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

- [x] 7. Implement `FeedComposer` component
  - [x] 7.1 Create `components/community/FeedComposer.tsx`
    - Accept props: `currentUser: string`, `onClose: () => void`, `onSubmit: (post: Omit<CommunityPost, 'id' | 'likeCount' | 'commentCount' | 'repostCount' | 'createdAt' | 'isLikedByUser' | 'isRepostedByUser'>) => Promise<void>`
    - Render as bottom-sheet overlay
    - Render three tabs at top: `Question`, `Poll`, `Meme`
    - Question tab: textarea (max 500 chars) with character counter
    - Poll tab: question input + 2 option inputs by default + "Add Option" button (up to 4) + "Remove" button per option (down to 2)
    - Meme tab: image URL input + optional caption textarea (max 280 chars) with character counter
    - "Post" button at bottom — runs `validatePost` on tap; shows inline error if invalid; calls `onSubmit` if valid
    - Close on backdrop tap or close button (discards draft)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 10.2, 10.3, 10.4_

  - [x] 7.2 Write unit tests for FeedComposer validation
    - Test "Post" button disabled/shows error for empty question
    - Test "Post" button disabled/shows error for question > 500 chars
    - Test poll with 1 option shows error
    - Test meme with no URL shows error
    - Test meme caption > 280 chars shows error
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 8. Implement `CommunityFeed` main component
  - [x] 8.1 Create `components/CommunityFeed.tsx`
    - Accept props: `user: UserProfile`, `points: number`
    - On mount: call `getPosts(user.name)`, store in state; show loading skeleton while fetching; on error show cached posts (from state) + non-blocking error banner "Couldn't load new posts."
    - Render header: app name (`font-serif italic font-bold`) + coin balance badge (yellow, consistent with existing design)
    - Render "Create Post" button fixed at top (always visible without scrolling)
    - Render scrollable feed list using `sortPostsByRecency(posts)`, mapping each to `<PostCard>`
    - Render empty state when no posts
    - Manage `FeedComposer` open/close state; on composer submit: call `createPost`, prepend new post to feed optimistically, close composer; on failure remove optimistic post + show toast
    - Manage `CommentSheet` open/close state per post; load comments via `getComments(postId)` when sheet opens
    - Handle like: optimistic update → `toggleLike` → revert on failure + toast
    - Handle repost: optimistic update → `toggleRepost` → revert on failure + toast
    - Handle share: `navigator.share` if available, else `navigator.clipboard.writeText` + toast
    - Handle delete: show confirmation modal → `deletePost` → remove from feed; on failure retain + toast
    - Handle poll vote: optimistic update → `castPostPollVote` → revert on failure + toast
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 2.7, 3.2, 3.3, 3.5, 4.2, 5.2, 5.3, 6.2, 6.3, 7.2, 7.3, 7.4, 8.2, 8.5, 9.2, 10.1_

  - [x] 8.2 Write integration tests for CommunityFeed
    - Test feed renders posts in reverse-chronological order
    - Test new post prepended after creation
    - Test like toggle updates count correctly
    - Test delete removes post from feed
    - _Requirements: 1.3, 2.7, 3.2, 7.3_

- [x] 9. Checkpoint — Ensure all component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Move battles content to Arena tab
  - [x] 10.1 Extract battles rendering from `components/Dashboard.tsx` into a `BattlesSection` sub-component within `components/Arena.tsx`
    - Move all battles-related JSX (search bar, filter chips, battle cards, comment modal, profile modal, bet confirmation modal) into a new `BattlesSection` component inside `Arena.tsx`
    - Accept the same battles-related props that Dashboard currently receives: `user`, `points`, `setPoints`, `battles`, `setBattles`, `bets`, `setBets`, `now`, `searchQuery`, `setSearchQuery`, `battleFilter`, `setBattleFilter`, `activeBattleId`, `setActiveBattleId`, `setActiveBattleConfig`, `setCurrentScreen`, `setSelectedBattleId`
    - _Requirements: 9.1, 9.3_

  - [x] 10.2 Add "Battles" tab to `components/Arena.tsx`
    - Add `'battles'` to the tab union type: `'challenges' | 'chat' | 'friends' | 'battles'`
    - Add "Battles" button to the tab selector row
    - Render `<BattlesSection>` when `tab === 'battles'`
    - Add battles-related props to Arena's Props interface
    - _Requirements: 9.1, 9.3, 9.4_

- [x] 11. Wire everything together in `app/page.tsx`
  - [x] 11.1 Replace Dashboard with CommunityFeed in `app/page.tsx`
    - Remove `import Dashboard` and add `import CommunityFeed`
    - Replace `{currentScreen === 'dashboard' && <Dashboard .../>}` with `{currentScreen === 'dashboard' && <CommunityFeed user={user} points={points} />}`
    - _Requirements: 1.1, 1.2, 9.2_

  - [x] 11.2 Pass battles props to Arena in `app/page.tsx`
    - Add battles-related props to the `<Arena>` render: `battles`, `setBattles`, `bets`, `setBets`, `now`, `searchQuery`, `setSearchQuery`, `battleFilter`, `setBattleFilter`, `activeBattleId`, `setActiveBattleId`, `setActiveBattleConfig`, `setCurrentScreen`, `setSelectedBattleId`
    - _Requirements: 9.1, 9.3_

- [x] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Property tests (2.2–2.7) validate universal correctness properties from the design document
- All Supabase tables (`posts`, `post_likes`, `post_comments`, `post_reposts`, `post_poll_votes`) must be created via migrations before running integration tests
- The `Dashboard.tsx` file can be deleted after task 10 is complete — its battles logic lives in `BattlesSection` inside `Arena.tsx`
- The `AppScreen` type and `BottomNav` require no changes
