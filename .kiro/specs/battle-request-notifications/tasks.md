# Tasks: Battle Request Notifications

## Task List

- [x] 1. Database migrations
  - [x] 1.1 Write migration to extend `invites` table: add `checkin_deadline timestamptz`, `challenger_checked_in boolean DEFAULT false`, `opponent_checked_in boolean DEFAULT false`; normalise status column to uppercase values; add unique partial index on `(from_name, to_name, challenge) WHERE status = 'PENDING'`
  - [x] 1.2 Write migration to create `notifications` table with columns `id uuid PK`, `user_id text`, `type text`, `invite_id uuid FK`, `payload jsonb`, `read boolean DEFAULT false`, `created_at timestamptz DEFAULT now()`; add index `notifications_user_unread ON notifications (user_id, read, created_at DESC)`

- [x] 2. TypeScript types
  - [x] 2.1 Add `BattleInviteStatus`, `BattleInvite`, `NotificationType`, and `AppNotification` types to `types/index.ts`
  - [x] 2.2 Add `computeParticipantCount`, `computeUnreadCount`, `computeTimeRemaining`, `sortAndGroupNotifications`, `renderNotificationMessage`, `filterSentRequests`, and `canGoLive` pure utility functions to a new `lib/battleRequestUtils.ts` file

- [x] 3. Database layer (`lib/db.ts` additions)
  - [x] 3.1 Implement `createBattleRequest(from, to, challenge, isPublic)` — inserts PENDING invite, inserts `battle_request` notification for opponent; enforces duplicate check
  - [x] 3.2 Implement `acceptBattleRequest(inviteId)` — sets status to ACCEPTED, sets `checkin_deadline = NOW() + 1 hour`, inserts `join_reminder` notification for challenger
  - [x] 3.3 Implement `rejectBattleRequest(inviteId)` — sets status to REJECTED, inserts `battle_declined` notification for challenger; returns error if invite is not PENDING
  - [x] 3.4 Implement `recordCheckin(inviteId, role)` — sets `challenger_checked_in` or `opponent_checked_in` to true; returns error if deadline has passed
  - [x] 3.5 Implement `tryGoLive(inviteId)` — if both check-in flags are true, sets status to LIVE, calls `createBattle`, returns true; otherwise returns false
  - [x] 3.6 Implement `createNotification`, `getNotifications`, `markNotificationRead`, `markAllNotificationsRead`
  - [x] 3.7 Implement `subscribeToInvite(inviteId, onUpdate)` — Supabase Realtime postgres_changes subscription on `invites` table filtered by id
  - [x] 3.8 Implement `subscribeToNotifications(userId, onNew)` — Supabase Realtime postgres_changes subscription on `notifications` table filtered by `user_id`

- [x] 4. Edge Function: `process-expired-invites`
  - [x] 4.1 Create Supabase Edge Function that queries `invites WHERE status = 'ACCEPTED' AND checkin_deadline < NOW() AND challenger_checked_in = false`; for each: sets status to ARCHIVED, inserts `default_win` notification for opponent and challenger
  - [x] 4.2 Configure the Edge Function to run on a cron schedule every 5 minutes via `supabase/functions/process-expired-invites/index.ts` and the Supabase scheduler

- [x] 5. Component: `NotificationBadge`
  - [x] 5.1 Create `components/NotificationBadge.tsx` — renders a bell icon with a red badge showing `unreadCount`; hides badge when count is 0; accepts `unreadCount: number` and `onClick: () => void` props

- [x] 6. Component: `NotificationsSection`
  - [x] 6.1 Create `components/NotificationsSection.tsx` — full-screen list of notifications grouped into unread/read, ordered by `createdAt` descending; calls `markNotificationRead` on tap; shows empty state when list is empty
  - [x] 6.2 Subscribe to `subscribeToNotifications` inside the component so new notifications appear in real-time without a page refresh
  - [x] 6.3 Render each notification using `renderNotificationMessage` and route taps to the correct screen (BattleRequestScreen for `battle_request`, WaitingPage for `join_reminder`/`battle_accepted`)

- [x] 7. Component: `SentRequestsTab`
  - [x] 7.1 Create `components/SentRequestsTab.tsx` — renders a list of PENDING invites where `from === currentUser`; each card shows opponent name, challenge name, sent time, and "Waiting for Acceptance" label; shows empty state when list is empty
  - [x] 7.2 Subscribe to `subscribeToInvite` for each displayed invite so status changes update the list in real-time

- [x] 8. Component: `BattleRequestScreen`
  - [x] 8.1 Create `components/BattleRequestScreen.tsx` — displays challenger name, challenge name, Accept and Reject buttons; calls `acceptBattleRequest` or `rejectBattleRequest` on tap; shows error message if invite is no longer PENDING

- [x] 9. Component: `WaitingPage`
  - [x] 9.1 Create `components/WaitingPage.tsx` — shows "Waiting for the Challenger to arrive..." (opponent role) or "Challenge Accepted — waiting for opponent" (challenger role); renders I_Am_Here_CTA button; calls `recordCheckin` on tap
  - [x] 9.2 Display countdown timer derived from `checkinDeadline` using a `setInterval` tick; show "Time expired" when countdown reaches zero
  - [x] 9.3 Subscribe to `subscribeToInvite` so that when status changes to LIVE both users are navigated to the battle screen

- [x] 10. Integration: wire components into the app shell
  - [x] 10.1 Add `NotificationBadge` to `BottomNav` (or a header area); wire it to the unread count from `getNotifications`
  - [x] 10.2 Add `NotificationsSection` as a navigable screen in `AppScreen` type and in `app/page.tsx` routing
  - [x] 10.3 Add `SentRequestsTab` as a tab inside the Arena component alongside the existing challenges/chat/friends tabs
  - [x] 10.4 Add `BattleRequestScreen` and `WaitingPage` as navigable screens in `AppScreen` type and in `app/page.tsx` routing
  - [x] 10.5 Replace the existing `handleAcceptInvite` / `handleRejectInvite` logic in `Arena.tsx` with calls to the new `acceptBattleRequest` / `rejectBattleRequest` db functions
  - [x] 10.6 Update the "Challenge" button flow in `Arena.tsx` to call `createBattleRequest` instead of directly creating a battle

- [x] 11. Property-based tests
  - [x] 11.1 Add `fast-check` as a dev dependency
  - [x] 11.2 Write property tests for `filterSentRequests` (Properties 2, 4)
  - [x] 11.3 Write property tests for `computeUnreadCount` and mark-as-read decrement (Properties 7, 8)
  - [x] 11.4 Write property tests for `canGoLive` single-check-in guard (Property 15)
  - [x] 11.5 Write property tests for `computeTimeRemaining` with future/past deadlines (Property 17)
  - [x] 11.6 Write property tests for `computeParticipantCount` (Property 20)
  - [x] 11.7 Write property tests for `sortAndGroupNotifications` (Property 21)
  - [x] 11.8 Write property tests for `renderNotificationMessage` covering all five notification types (Property 22)
  - [x] 11.9 Write property tests for `acceptBattleRequest` checkin_deadline calculation (Property 16)
  - [x] 11.10 Write property tests for duplicate PENDING request rejection (Property 5)
  - [x] 11.11 Write property tests for `rejectBattleRequest` on non-PENDING invite (Property 11)

- [ ] 12. Unit tests
  - [x] 12.1 Write unit tests for `SentRequestsTab` empty state
  - [x] 12.2 Write unit tests for `BattleRequestScreen` rendering with challenger info
  - [x] 12.3 Write unit tests for `WaitingPage` rendering I_Am_Here_CTA for both roles
  - [x] 12.4 Write unit tests for `NotificationsSection` empty state
  - [ ] 12.5 Write unit tests for `NotificationBadge` hiding when count is 0

- [x] 13. Ghost battle fix — filter PENDING/ACCEPTED battles from public arena
  - [x] 13.1 Update `filterBattles` in `lib/filters.ts` to return `false` for any battle whose `status` is `'PENDING'` or `'ACCEPTED'`, before the search and tab-filter logic runs
  - [x] 13.2 Remove (or gate) the legacy `onCreateInvite` path in `app/page.tsx` that creates a `battles` row with `status = 'upcoming'` for public invites — battle rows must only be created by `tryGoLive` once both check-ins are confirmed
  - [x] 13.3 Verify that `getBattles` in `lib/db.ts` does not need an explicit status filter (since `tryGoLive` is the only writer of battle rows); add a `.not('status', 'in', '("PENDING","ACCEPTED")')` guard as defence-in-depth if ghost rows are found in the table

- [x] 14. Notification delivery fallback — 10-second polling in `app/page.tsx`
  - [x] 14.1 Add a `useEffect` in `app/page.tsx` (scoped to when `user` is set) that calls `getNotifications(user.name)` on a `setInterval` of 10 000 ms and replaces `notifications` state with the fresh result; clean up the interval on unmount or when `user` changes
  - [x] 14.2 Ensure the polling `useEffect` and the existing initial-load `useEffect` do not race — the polling interval should start after the initial load completes (or simply let both run, since state replacement is idempotent)

- [x] 15. Stale invite fix — re-fetch invite before showing `BattleRequestScreen`
  - [x] 15.1 In the `onNotificationTap` handler in `app/page.tsx`, when `notif.type === 'battle_request'`, fetch the invite row from the DB (via `getInvites` or a new `getInviteById` helper) before setting `activeInviteId` and navigating to `'battle_request'`; pass the freshly fetched invite so `BattleRequestScreen` reflects the current status
  - [x] 15.2 Add a `getInviteById(inviteId: string): Promise<BattleInvite | null>` function to `lib/db.ts` that queries `invites` by `id` and maps the row to a `BattleInvite` object; return `null` if not found

- [ ] 16. Run database migrations
  - [ ] 16.1 Apply `supabase/migrations/20240001000000_extend_invites_for_battle_requests.sql` via `supabase db push` (or `supabase migration up` for local dev) to add `checkin_deadline`, `challenger_checked_in`, `opponent_checked_in` columns and the unique partial index to the `invites` table
  - [ ] 16.2 Apply `supabase/migrations/20240001000001_create_notifications_table.sql` to create the `notifications` table and its index

- [x] 17. NotificationContext provider
  - [x] 17.1 Create `lib/NotificationContext.tsx` — React context with shape `{ notifications, unreadCount, setNotifications, markRead, markAllRead }`; derive `unreadCount` as `notifications.filter(n => !n.read).length`
    - _Requirements: 14.9, 14.10_
  - [x] 17.2 Create `NotificationContextProvider` component that holds notifications state, runs the 10-second polling interval internally (moved from `app/page.tsx`), and subscribes to `subscribeToNotifications` for real-time updates
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 14.10, 14.11_
  - [x] 17.3 Mount `NotificationContextProvider` at the layout level in `app/layout.tsx` (or a top-level providers wrapper), wrapping all page content
    - _Requirements: 14.10_

- [x] 18. NotificationCenter component (bell + dropdown)
  - [x] 18.1 Create `components/NotificationCenter.tsx` — composite component with bell icon in the Dashboard header (top-right); reads `unreadCount` from `NotificationContext`; toggles `isOpen` state on bell click; closes on outside click via `useEffect` + `mousedown` listener
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.6, 14.9_
  - [x] 18.2 Create `components/NotificationDropdown.tsx` — floating scrollable popover; renders all notifications ordered by recency; for `battle_request` notifications renders inline Accept and Reject buttons; applies per-notification `isSubmitting` map for optimistic updates (disable buttons + spinner on tap, rollback on error, retain disabled on success)
    - _Requirements: 14.5, 14.7, 14.8, 13.1, 13.2, 13.3, 13.4, 13.5_
  - [x] 18.3 Wire `NotificationCenter` into the Dashboard header (in `components/Dashboard.tsx` or `app/layout.tsx`), replacing or supplementing the existing `NotificationBadge` in `BottomNav`
    - _Requirements: 14.1_

- [x] 19. Optimistic updates in BattleRequestScreen and inline actions
  - [x] 19.1 Update `components/BattleRequestScreen.tsx` to add `isSubmitting: boolean` local state; set it to `true` synchronously on Accept/Reject tap before any async call; disable both buttons while `isSubmitting` is true; show loading spinner on the tapped button; roll back on error with toast; retain disabled on success
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  - [x] 19.2 Ensure `BattleRequestScreen` and `NotificationDropdown` pass the `notificationId` (UUID from `AppNotification.id`) to `acceptBattleRequest` and `rejectBattleRequest`, not the `userId` string
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [x] 20. Update db functions for notification cleanup
  - [x] 20.1 Update `acceptBattleRequest(inviteId, notificationId?)` in `lib/db.ts` — when `notificationId` is provided, mark that notification as `read = true` in the same operation as the invite status update; log inconsistency if cleanup fails while invite update succeeds
    - _Requirements: 15.1, 15.3, 15.4, 15.5_
  - [x] 20.2 Update `rejectBattleRequest(inviteId, notificationId?)` in `lib/db.ts` — same pattern as 20.1
    - _Requirements: 15.2, 15.3, 15.4, 15.5_

- [x] 21. Remove polling from app/page.tsx
  - [x] 21.1 Remove the 10-second polling `useEffect` from `app/page.tsx` (it is now handled by `NotificationContextProvider`); ensure no duplicate polling occurs
    - _Requirements: 11.1, 14.11_

- [ ] 22. Property-based tests for new properties
  - [ ]* 22.1 Write property test for Property 23: optimistic update sets `isSubmitting = true` synchronously before async call
    - **Property 23: Optimistic update sets isSubmitting synchronously before any async call**
    - **Validates: Requirements 13.1, 13.2, 13.5**
  - [ ]* 22.2 Write property test for Property 24: `computeUnreadCount` returns 0 when all read, exact count otherwise
    - **Property 24: computeUnreadCount returns exact count of unread notifications**
    - **Validates: Requirements 14.2, 14.3**
  - [ ]* 22.3 Write property test for Property 25: `Notification_Dropdown` renders exactly one Accept and one Reject button per `battle_request` notification
    - **Property 25: Notification_Dropdown renders exactly one Accept and one Reject button per battle_request notification**
    - **Validates: Requirements 14.7**

- [ ] 23. Unit tests for new components
  - [ ]* 23.1 Write unit test for `NotificationCenter` — bell icon visible in header; badge hidden when `unreadCount === 0`; badge shows count when `unreadCount > 0`
    - _Requirements: 14.1, 14.2, 14.3_
  - [ ]* 23.2 Write unit test for `NotificationDropdown` — renders inline Accept/Reject only for `battle_request` notifications; buttons disabled after tap (optimistic update)
    - _Requirements: 14.7, 14.8, 13.1_
  - [ ] 23.3 Complete task 12.5: Write unit test for `NotificationBadge` hiding when count is 0
    - _Requirements: 3.3_
