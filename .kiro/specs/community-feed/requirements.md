# Requirements Document

## Introduction

The Community Feed is a new social hub for the habuild-arena fitness battle app. It replaces the current Dashboard as the HOME tab, giving users a Reddit/Twitter-style feed where they can post questions, run polls, and share memes/images. The existing battles content moves out of the Dashboard and into the Arena tab. The Community Feed is designed to foster peer support, tips, and engagement between fitness battles.

The `AppScreen` type will be updated so that `'dashboard'` serves as the Community Feed screen (renamed conceptually to "feed"), and the BottomNav HOME tab continues to point to `'dashboard'`. No new screen key is introduced — the Dashboard component is replaced with the CommunityFeed component.

## Glossary

- **Community_Feed**: The new HOME screen component that replaces the Dashboard, displaying a scrollable list of community posts.
- **Post**: A user-created content item of type Question, Poll, or Meme. Stored in Supabase.
- **Post_Type**: One of three variants — `question`, `poll`, or `meme`.
- **Question_Post**: A text-based post where a user asks the community a question.
- **Poll_Post**: A post containing a question and 2–4 answer options that community members can vote on.
- **Meme_Post**: A post containing an image (uploaded or URL) with optional caption text.
- **Post_Author**: The `UserProfile` who created a Post.
- **Like**: A single per-user positive reaction on a Post.
- **Comment**: A text reply attached to a Post, authored by a `UserProfile`.
- **Repost**: A re-share of an existing Post that appears in the feed attributed to the reposter.
- **Feed_Composer**: The UI element that allows a user to create a new Post.
- **Vote**: A single per-user selection on a Poll_Post option.
- **Arena_Tab**: The existing `'arena'` AppScreen, which will absorb the battles/invites content previously shown in the Dashboard.
- **BottomNav**: The bottom navigation bar with tabs: HOME, ARENA, RANK, REFER, ME.

---

## Requirements

### Requirement 1: Community Feed as the HOME Tab

**User Story:** As a user, I want the HOME tab to show a community feed instead of battles, so that I have a social hub to connect with other fitness enthusiasts.

#### Acceptance Criteria

1. THE Community_Feed SHALL be rendered when the `AppScreen` value is `'dashboard'`.
2. THE BottomNav HOME tab SHALL navigate to the `'dashboard'` screen, displaying the Community_Feed.
3. THE Community_Feed SHALL display a scrollable list of Posts in reverse-chronological order (newest first).
4. WHEN the Community_Feed loads, THE Community_Feed SHALL fetch Posts from the Supabase `posts` table.
5. IF the Supabase fetch fails, THEN THE Community_Feed SHALL display the most recently cached Posts and show a non-blocking error indicator.
6. THE Community_Feed SHALL display a header with the app name and a coin balance indicator consistent with the existing design system.

---

### Requirement 2: Post Types

**User Story:** As a user, I want to create different types of posts (questions, polls, memes), so that I can engage the community in varied ways.

#### Acceptance Criteria

1. THE Feed_Composer SHALL support three Post_Types: `question`, `poll`, and `meme`.
2. WHEN a user selects the `question` Post_Type, THE Feed_Composer SHALL display a text input for the question body (maximum 500 characters).
3. WHEN a user selects the `poll` Post_Type, THE Feed_Composer SHALL display a question text input and between 2 and 4 option inputs.
4. WHEN a user selects the `meme` Post_Type, THE Feed_Composer SHALL display an image URL input and an optional caption text input (maximum 280 characters).
5. WHEN a user submits a Post, THE Feed_Composer SHALL validate that required fields are non-empty before submission.
6. IF required fields are empty on submission, THEN THE Feed_Composer SHALL display an inline validation message without dismissing the composer.
7. WHEN a Post is successfully submitted, THE Community_Feed SHALL prepend the new Post to the top of the feed without requiring a full page reload.

---

### Requirement 3: Post Interactions — Likes

**User Story:** As a user, I want to like posts, so that I can show appreciation for helpful or entertaining content.

#### Acceptance Criteria

1. THE Community_Feed SHALL display a like count on each Post.
2. WHEN a user taps the like button on a Post they have not yet liked, THE Community_Feed SHALL increment the like count by 1 and mark the button as active for that user.
3. WHEN a user taps the like button on a Post they have already liked, THE Community_Feed SHALL decrement the like count by 1 and mark the button as inactive for that user.
4. THE Community_Feed SHALL persist like state to Supabase so that like counts survive page reloads.
5. IF the like update fails, THEN THE Community_Feed SHALL revert the optimistic UI update and display a brief error toast.

---

### Requirement 4: Post Interactions — Comments

**User Story:** As a user, I want to comment on posts, so that I can reply, give tips, and support other community members.

#### Acceptance Criteria

1. THE Community_Feed SHALL display a comment count on each Post.
2. WHEN a user taps the comment button on a Post, THE Community_Feed SHALL open a bottom-sheet modal showing existing Comments and a text input.
3. WHEN a user submits a Comment, THE Community_Feed SHALL append the Comment to the Post's comment list and persist it to Supabase.
4. THE Community_Feed SHALL display each Comment with the author's name and comment text.
5. IF the comment submission fails, THEN THE Community_Feed SHALL retain the typed text in the input and display an inline error message.

---

### Requirement 5: Post Interactions — Reposts

**User Story:** As a user, I want to repost content, so that I can amplify helpful posts to my followers.

#### Acceptance Criteria

1. THE Community_Feed SHALL display a repost count on each Post.
2. WHEN a user taps the repost button on a Post they have not yet reposted, THE Community_Feed SHALL create a Repost attributed to the current user and increment the repost count.
3. WHEN a user taps the repost button on a Post they have already reposted, THE Community_Feed SHALL remove the Repost and decrement the repost count.
4. THE Community_Feed SHALL display Reposts in the feed with a "reposted by [username]" attribution label above the original Post content.
5. THE Community_Feed SHALL persist repost state to Supabase.

---

### Requirement 6: Post Interactions — Share

**User Story:** As a user, I want to share posts outside the app, so that I can invite others to join the community.

#### Acceptance Criteria

1. THE Community_Feed SHALL display a share button on each Post.
2. WHEN a user taps the share button, THE Community_Feed SHALL invoke the native Web Share API with a link and text describing the Post.
3. IF the Web Share API is unavailable, THEN THE Community_Feed SHALL copy a shareable link to the clipboard and display a confirmation toast.

---

### Requirement 7: Post Deletion (Own Posts Only)

**User Story:** As a user, I want to delete my own posts, so that I can remove content I no longer want visible.

#### Acceptance Criteria

1. THE Community_Feed SHALL display a delete option only on Posts where the Post_Author matches the currently authenticated user.
2. WHEN a user taps the delete option on their own Post, THE Community_Feed SHALL display a confirmation prompt before deletion.
3. WHEN the user confirms deletion, THE Community_Feed SHALL remove the Post from the feed and delete it from Supabase.
4. IF the deletion fails, THEN THE Community_Feed SHALL retain the Post in the feed and display an error toast.
5. THE Community_Feed SHALL NOT display a delete option on Posts authored by other users.

---

### Requirement 8: Poll Voting

**User Story:** As a user, I want to vote on polls, so that I can participate in community decisions and see what others think.

#### Acceptance Criteria

1. WHEN a Poll_Post is displayed, THE Community_Feed SHALL show each poll option as a tappable button with the current vote count and percentage.
2. WHEN a user taps a poll option they have not yet voted on, THE Community_Feed SHALL record the Vote, update the option's count and percentage, and disable further voting for that user on that Poll_Post.
3. WHEN a user has already voted on a Poll_Post, THE Community_Feed SHALL display the results with the user's chosen option highlighted and all options non-interactive.
4. THE Community_Feed SHALL persist Vote state to Supabase.
5. IF the vote submission fails, THEN THE Community_Feed SHALL revert the optimistic UI update and re-enable the poll options.

---

### Requirement 9: Navigation — Battles Move to Arena Tab

**User Story:** As a user, I want battles to be accessible from the Arena tab, so that the HOME tab is dedicated to the community feed.

#### Acceptance Criteria

1. THE Arena_Tab SHALL display the battles list, search, filter, and betting UI previously shown in the Dashboard.
2. THE Community_Feed SHALL NOT display any battles content.
3. WHEN a user navigates to the `'arena'` AppScreen, THE Arena_Tab SHALL render the battles section as the primary content.
4. THE BottomNav ARENA tab SHALL continue to navigate to the `'arena'` AppScreen.

---

### Requirement 10: Feed Composer Access

**User Story:** As a user, I want a prominent way to create a new post from the feed, so that contributing to the community is easy.

#### Acceptance Criteria

1. THE Community_Feed SHALL display a persistent "Create Post" button or composer trigger visible without scrolling.
2. WHEN a user taps the "Create Post" trigger, THE Feed_Composer SHALL open as a bottom-sheet or modal overlay.
3. WHEN the Feed_Composer is open, THE Community_Feed SHALL allow the user to dismiss it by tapping outside or pressing a close button, discarding any unsaved draft.
4. THE Feed_Composer SHALL display Post_Type selector tabs for `question`, `poll`, and `meme` at the top of the composer.

---

### Requirement 11: Post Display

**User Story:** As a user, I want posts to be clearly presented with author info and timestamps, so that I can understand context and recency.

#### Acceptance Criteria

1. THE Community_Feed SHALL display each Post with: author avatar (initials-based), author name, Post_Type label, relative timestamp, and post content.
2. THE Community_Feed SHALL display Meme_Post images with a maximum height of 300px, maintaining aspect ratio.
3. IF a Meme_Post image URL fails to load, THEN THE Community_Feed SHALL display a placeholder with the caption text.
4. THE Community_Feed SHALL display the Post_Type label (`Question`, `Poll`, `Meme`) as a badge on each Post card.
5. THE Community_Feed SHALL use the existing design system: serif-italic headings, 3D tactile buttons (`shadow-[0_Npx_0_color] active:shadow-none active:translate-y`), and soft containers (`bg-white border-2 border-gray-100 rounded-2xl shadow-sm`).
