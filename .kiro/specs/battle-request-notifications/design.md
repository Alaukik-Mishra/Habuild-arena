# Design Document: Battle Request Notifications

## Overview

This feature implements the five-phase "Challenge-Response-Check-in" model for battle creation. The core principle is that a battle only becomes live — and only increments the Participant Count — when both participants have actively confirmed their presence via the "I am Here" CTA and are connected on the Supabase Realtime socket.

The system extends the existing `invites` table with richer status tracking and check-in columns, introduces a new `notifications` table, and adds five new React components. All real-time delivery is handled via Supabase Realtime postgres_changes subscriptions, consistent with the existing `subscribeToBattle` and `subscribeToChat` patterns in `lib/db.ts`.

### Five Phases Summary

| Phase | Trigger | Invite Status | Battle Visible? |
|---|---|---|---|
| 1. Initiation | Challenger taps "Challenge" | `PENDING` | No |
| 2. Acceptance | Opponent accepts | `ACCEPTED` | No |
| 3. Check-in | Both click "I am Here" | `CHECKED_IN_OPPONENT` → `LIVE` | No → Yes |
| 4. Countdown | 60-min timer from acceptance | `ACCEPTED` (timer running) | No |
| 5. Live | Both checked in + on socket | `LIVE` | Yes |

---

## Architecture

The feature follows the existing layered architecture of the codebase:

```
┌─────────────────────────────────────────────────────────┐
│  app/layout.tsx                                          │
│  NotificationContextProvider (mounted at layout level)   │
│  holds: notifications[], unreadCount, markRead, etc.     │
└────────────────────┬────────────────────────────────────┘
                     │ React Context
┌────────────────────▼────────────────────────────────────┐
│  React Components (Next.js App Router, client components)│
│  NotificationCenter (bell + Notification_Dropdown)       │
│  SentRequestsTab · BattleRequestScreen · WaitingPage     │
│  NotificationsSection · NotificationBadge                │
└────────────────────┬────────────────────────────────────┘
                     │ calls
┌────────────────────▼────────────────────────────────────┐
│  lib/db.ts  (new functions added alongside existing ones) │
│  createBattleRequest · acceptBattleRequest               │
│  rejectBattleRequest · recordCheckin · tryGoLive         │
│  createNotification · markNotificationRead               │
│  subscribeToInvite · subscribeToNotifications            │
└────────────────────┬────────────────────────────────────┘
                     │ Supabase JS SDK
┌────────────────────▼────────────────────────────────────┐
│  Supabase (Postgres + Realtime + Edge Functions)         │
│  invites table (extended) · notifications table (new)    │
│  Edge Function: process-expired-invites (cron)           │
└─────────────────────────────────────────────────────────┘
```

### Real-time Flow

```
Challenger                    Supabase DB              Opponent
    │                              │                       │
    │── createBattleRequest() ────►│                       │
    │                              │── INSERT invite ─────►│
    │                              │   (PENDING)           │
    │                              │── INSERT notification►│
    │                              │   (battle_request)    │
    │                              │                       │◄── NotificationContext polls/subscribes
    │                              │                       │    badge increments (unreadCount++)
    │                              │                       │── tap bell → Notification_Dropdown opens
    │                              │                       │── tap Accept/Reject (optimistic update)
    │                              │                       │   isSubmitting=true synchronously
    │                              │                       │── acceptBattleRequest(id, notifId) OR
    │                              │                       │── rejectBattleRequest(id, notifId)
    │                              │◄── UPDATE invite ─────│
    │                              │    (ACCEPTED)         │
    │                              │◄── mark notif read ───│
    │◄── subscribeToInvite() ──────│                       │
    │    join_reminder notif        │                       │── WaitingPage shown
    │── I_Am_Here_CTA              │                       │── I_Am_Here_CTA
    │── recordCheckin('challenger')►│                       │── recordCheckin('opponent')►│
    │                              │── both flags true     │
    │                              │── tryGoLive()         │
    │                              │── UPDATE invite LIVE  │
    │                              │── INSERT battle row   │
    │◄── subscribeToInvite() ──────│──────────────────────►│
    │    navigate to battle         │                       │    navigate to battle
```

---

## Components and Interfaces

### New Components

#### `components/SentRequestsTab.tsx`

Displays the Challenger's outgoing PENDING requests. Subscribes to invite status changes via Supabase Realtime so the list updates without a page refresh.

```typescript
interface SentRequestsTabProps {
  userName: string;
  invites: BattleInvite[];          // filtered to PENDING where from === userName
  onInviteStatusChange: (id: string, status: BattleInviteStatus) => void;
}
```

#### `components/BattleRequestScreen.tsx`

Shown to the Opponent when they tap a `battle_request` notification. Displays challenger info and Accept/Reject buttons. Handles the race condition where the invite is no longer PENDING.

```typescript
interface BattleRequestScreenProps {
  invite: BattleInvite;
  currentUserName: string;
  onAccept: (inviteId: string) => Promise<void>;
  onReject: (inviteId: string) => Promise<void>;
  onBack: () => void;
}
```

#### `components/WaitingPage.tsx`

Shown to the Opponent after accepting. Displays the countdown timer and the I_Am_Here_CTA. Also shown to the Challenger (with different copy) after they receive the `join_reminder` notification.

```typescript
interface WaitingPageProps {
  invite: BattleInvite;
  role: 'challenger' | 'opponent';
  currentUserName: string;
  onCheckIn: (inviteId: string, role: 'challenger' | 'opponent') => Promise<void>;
  onBack: () => void;
}
```

#### `components/NotificationsSection.tsx`

Full-screen notifications list. Groups notifications into unread/read, ordered by `created_at` descending. Marks notifications as read on view.

```typescript
interface NotificationsSectionProps {
  notifications: AppNotification[];
  onMarkRead: (notificationId: string) => Promise<void>;
  onNotificationTap: (notification: AppNotification) => void;
  onBack: () => void;
}
```

#### `components/NotificationBadge.tsx`

Bell icon button rendered in the **Dashboard header** (top-right corner, visible on all pages). Shows a red badge with the unread count; the badge is hidden entirely when `unreadCount === 0`.

```typescript
interface NotificationBadgeProps {
  unreadCount: number;
  onClick: () => void;
}
```

#### `components/NotificationCenter.tsx`

Composite component that combines the `NotificationBadge` bell icon with the `Notification_Dropdown` popover. Lives in the Dashboard header. Reads `notifications` and `unreadCount` from `NotificationContext` — it does not accept these as props.

```typescript
interface NotificationCenterProps {
  /** Called when the user taps Accept on a battle_request notification inline. */
  onAccept: (inviteId: string, notificationId: string) => Promise<void>;
  /** Called when the user taps Reject on a battle_request notification inline. */
  onReject: (inviteId: string, notificationId: string) => Promise<void>;
}
```

Internal state:
- `isOpen: boolean` — controls whether the dropdown popover is visible
- Clicking the bell toggles `isOpen`; clicking outside sets `isOpen = false` (via a `useEffect` that attaches a `mousedown` listener to `document`)

#### `components/Notification_Dropdown.tsx`

Floating, scrollable popover anchored to the bell icon. Renders all notifications ordered by recency. For `battle_request` notifications, renders inline Accept and Reject buttons that apply optimistic updates per Requirement 13.

```typescript
interface NotificationDropdownProps {
  notifications: AppNotification[];
  onClose: () => void;
  onAccept: (inviteId: string, notificationId: string) => Promise<void>;
  onReject: (inviteId: string, notificationId: string) => Promise<void>;
  onMarkRead: (notificationId: string) => Promise<void>;
}
```

Inline action button behaviour for `battle_request` notifications:
- On tap: set `isSubmitting[notificationId] = true` **synchronously** (same event loop tick), disable both buttons, show spinner on tapped button
- On success: retain disabled state; the notification is removed/marked-read via `NotificationContext`
- On error: roll back `isSubmitting[notificationId] = false`, re-enable buttons, show error toast

### Notification Context

`NotificationContext` is a React context provider mounted at the **layout level** (in `app/layout.tsx` or a top-level wrapper component) so that all pages share a single notifications state. This prevents badge count drift when the user navigates between pages.

#### Context shape

```typescript
interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = React.createContext<NotificationContextValue | null>(null);
```

#### Provider placement

```tsx
// app/layout.tsx (or a dedicated providers.tsx wrapper)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NotificationContextProvider>
          {children}
        </NotificationContextProvider>
      </body>
    </html>
  );
}
```

#### Provider responsibilities

- Holds `notifications: AppNotification[]` and derives `unreadCount` as `notifications.filter(n => !n.read).length`
- Runs the 10-second polling interval (`getNotifications(userId)`) internally — **not** in `app/page.tsx` — so polling updates only touch context state and never cause layout shifts in the main dashboard area
- Exposes `markRead(notificationId)` which calls `markNotificationRead(notificationId)` and updates local state optimistically
- Exposes `markAllRead()` which calls `markAllNotificationsRead(userId)` and sets all notifications to `read: true` locally
- All components that need notification data (`NotificationCenter`, `Notification_Dropdown`, etc.) consume via `useContext(NotificationContext)` rather than receiving props

### New `lib/db.ts` Functions

```typescript
// Invite management
createBattleRequest(from: string, to: string, challenge: string, isPublic: boolean): Promise<string>
acceptBattleRequest(inviteId: string, notificationId?: string): Promise<void>
rejectBattleRequest(inviteId: string, notificationId?: string): Promise<void>
recordCheckin(inviteId: string, role: 'challenger' | 'opponent'): Promise<void>
tryGoLive(inviteId: string): Promise<boolean>  // returns true if battle went live

// Notifications
createNotification(notification: Omit<AppNotification, 'id' | 'created_at' | 'read'>): Promise<string>
getNotifications(userId: string): Promise<AppNotification[]>
markNotificationRead(notificationId: string): Promise<void>
markAllNotificationsRead(userId: string): Promise<void>

// Realtime subscriptions
subscribeToInvite(inviteId: string, onUpdate: (invite: BattleInvite) => void): () => void
subscribeToNotifications(userId: string, onNew: (notification: AppNotification) => void): () => void
```

When `notificationId` is provided to `acceptBattleRequest` or `rejectBattleRequest`, the function marks that notification as `read = true` in the same database operation as the invite status update, keeping invite state and notification state consistent (Requirement 15.4). If the notification cleanup fails while the invite update succeeds, the inconsistency is logged and the next polling cycle reconciles the state (Requirement 15.5).

---

## Data Models

### Extended `invites` Table

The existing `invites` table is extended with new columns via a migration:

```sql
-- Migration: extend invites table for battle-request-notifications
ALTER TABLE invites
  ALTER COLUMN status TYPE text,
  ADD COLUMN checkin_deadline timestamptz,
  ADD COLUMN challenger_checked_in boolean NOT NULL DEFAULT false,
  ADD COLUMN opponent_checked_in boolean NOT NULL DEFAULT false;

-- Add a unique constraint to prevent duplicate PENDING requests
CREATE UNIQUE INDEX invites_pending_unique
  ON invites (from_name, to_name, challenge)
  WHERE status = 'PENDING';
```

New valid values for `status`: `PENDING`, `ACCEPTED`, `REJECTED`, `CHECKED_IN_OPPONENT`, `LIVE`, `ARCHIVED`

> Note: existing rows use lowercase `pending`/`accepted`/`rejected`. A data migration normalises these to uppercase, or the application layer maps them. The design uses uppercase throughout for clarity.

### New `notifications` Table

```sql
CREATE TABLE notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       text NOT NULL,          -- recipient's profile name (matches existing name-based FK pattern)
  type          text NOT NULL,          -- battle_request | battle_accepted | battle_declined | join_reminder | default_win
  invite_id     uuid REFERENCES invites(id) ON DELETE CASCADE,
  payload       jsonb NOT NULL DEFAULT '{}',  -- challenger_name, challenge_name, etc.
  read          boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_unread ON notifications (user_id, read, created_at DESC);
```

### TypeScript Types (additions to `types/index.ts`)

```typescript
export type BattleInviteStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CHECKED_IN_OPPONENT'
  | 'LIVE'
  | 'ARCHIVED';

export interface BattleInvite {
  id: string;
  from: string;                        // challenger name
  to: string;                          // opponent name
  challenge: string;
  scheduledTime: number;
  status: BattleInviteStatus;
  isPublic: boolean;
  timestamp: number;
  checkinDeadline?: number;            // ms timestamp, set on ACCEPTED
  challengerCheckedIn: boolean;
  opponentCheckedIn: boolean;
}

export type NotificationType =
  | 'battle_request'
  | 'battle_accepted'
  | 'battle_declined'
  | 'join_reminder'
  | 'default_win';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  inviteId?: string;
  payload: {
    challengerName?: string;
    opponentName?: string;
    challengeName?: string;
  };
  read: boolean;
  createdAt: number;
}
```

### Participant Count Derivation

`Participant_Count` is derived at query time — it is never stored as a mutable counter. The count equals the number of battles with `status = 'live'` multiplied by 2 (both participants confirmed). This is consistent with Requirement 8.5.

```typescript
// Pure function — no side effects
export function computeParticipantCount(battles: LiveBattle[]): number {
  return battles.filter(b => b.status === 'live').length * 2;
}
```

### 1-Hour Countdown Logic

When `acceptBattleRequest` is called:
1. `checkin_deadline` is set to `NOW() + INTERVAL '1 hour'`
2. A `join_reminder` notification is inserted for the challenger
3. The Supabase Edge Function `process-expired-invites` runs on a cron schedule (every 5 minutes) and:
   - Queries `invites WHERE status = 'ACCEPTED' AND checkin_deadline < NOW() AND challenger_checked_in = false`
   - For each expired invite: sets `status = 'ARCHIVED'`, inserts two `default_win` notifications

The client-side `WaitingPage` computes the remaining time from `checkinDeadline` using a `setInterval` tick — it does not rely on the server for the display countdown.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: PENDING invite creation produces no live battle

*For any* valid (challenger, opponent, challenge) triple, calling `createBattleRequest` shall produce exactly one invite row with status `PENDING` and zero new rows in the `battles` table.

**Validates: Requirements 1.1, 1.3, 1.4**

---

### Property 2: Sent Requests Tab filter correctness

*For any* array of `BattleInvite` objects with mixed statuses and mixed `from`/`to` users, the `filterSentRequests(invites, currentUser)` function shall return only those invites where `from === currentUser` AND `status === 'PENDING'`.

**Validates: Requirements 1.2, 2.1**

---

### Property 3: Sent Requests Tab card renders required fields

*For any* `BattleInvite` with status `PENDING`, the rendered `SentRequestCard` shall contain the opponent's name, the challenge name, the sent timestamp, and the text "Waiting for Acceptance".

**Validates: Requirements 2.2**

---

### Property 4: Status change removes invite from pending list

*For any* array of `BattleInvite` objects containing a PENDING invite, simulating a status-change event to `ACCEPTED` or `REJECTED` on that invite shall result in the invite no longer appearing in the `filterSentRequests` output.

**Validates: Requirements 2.3**

---

### Property 5: Duplicate PENDING request is rejected

*For any* (challenger, opponent, challenge) triple, if a `PENDING` invite already exists for that triple, a second call to `createBattleRequest` with the same triple shall return an error and shall not insert a new row.

**Validates: Requirements 1.5**

---

### Property 6: battle_request notification contains required fields

*For any* `AppNotification` of type `battle_request`, the notification object shall contain non-empty `payload.challengerName`, `payload.challengeName`, and a non-null `inviteId`.

**Validates: Requirements 3.2**

---

### Property 7: Unread badge count equals count of unread notifications

*For any* array of `AppNotification` objects, `computeUnreadCount(notifications)` shall return exactly the number of notifications where `read === false`.

**Validates: Requirements 3.3, 3.4**

---

### Property 8: Marking a notification read decrements unread count by one

*For any* array of `AppNotification` objects containing at least one unread notification, marking one unread notification as read shall reduce `computeUnreadCount` by exactly 1.

**Validates: Requirements 3.4**

---

### Property 9: Accept transitions invite to ACCEPTED without creating a battle

*For any* `BattleInvite` with status `PENDING`, calling `acceptBattleRequest(inviteId)` shall set the invite status to `ACCEPTED` and shall not insert a row into the `battles` table.

**Validates: Requirements 4.2**

---

### Property 10: Reject transitions invite to REJECTED

*For any* `BattleInvite` with status `PENDING`, calling `rejectBattleRequest(inviteId)` shall set the invite status to `REJECTED` and shall not insert a row into the `battles` table.

**Validates: Requirements 4.4, 4.5, 5.3**

---

### Property 11: Accept/reject on non-PENDING invite returns an error

*For any* `BattleInvite` with status other than `PENDING` (`ACCEPTED`, `REJECTED`, `LIVE`, `ARCHIVED`), calling `acceptBattleRequest` or `rejectBattleRequest` shall return an error and shall not modify the invite row.

**Validates: Requirements 4.6**

---

### Property 12: Rejection creates a battle_declined notification for the challenger

*For any* `BattleInvite` with status `PENDING`, calling `rejectBattleRequest(inviteId)` shall insert exactly one `AppNotification` row with `type = 'battle_declined'` and `userId = invite.from`.

**Validates: Requirements 5.1**

---

### Property 13: Acceptance creates a join_reminder notification for the challenger

*For any* `BattleInvite` with status `PENDING`, calling `acceptBattleRequest(inviteId)` shall insert exactly one `AppNotification` row with `type = 'join_reminder'` and `userId = invite.from`.

**Validates: Requirements 6.1**

---

### Property 14: Check-in records the correct flag

*For any* `BattleInvite` with status `ACCEPTED`, calling `recordCheckin(inviteId, 'challenger')` shall set `challenger_checked_in = true` without changing `opponent_checked_in`, and calling `recordCheckin(inviteId, 'opponent')` shall set `opponent_checked_in = true` without changing `challenger_checked_in`.

**Validates: Requirements 6.3, 6.4**

---

### Property 15: Single check-in does not trigger LIVE transition

*For any* `BattleInvite` where exactly one of `challengerCheckedIn` or `opponentCheckedIn` is `true` and the other is `false`, `canGoLive(invite)` shall return `false`.

**Validates: Requirements 6.5, 8.4**

---

### Property 16: Acceptance sets checkin_deadline to exactly 60 minutes from now

*For any* acceptance timestamp `t`, calling `acceptBattleRequest` shall set `checkin_deadline` to `t + 3_600_000` milliseconds (±1 second tolerance for execution time).

**Validates: Requirements 7.1**

---

### Property 17: Remaining time is positive for future deadlines

*For any* `checkinDeadline` timestamp in the future (i.e., `checkinDeadline > Date.now()`), `computeTimeRemaining(checkinDeadline)` shall return a positive number of milliseconds.

**Validates: Requirements 7.2**

---

### Property 18: Expired invite with no challenger check-in awards default win

*For any* `BattleInvite` where `status = 'ACCEPTED'`, `checkinDeadline < Date.now()`, and `challengerCheckedIn = false`, calling `processExpiredInvite(invite)` shall set `status = 'ARCHIVED'` and insert exactly two `AppNotification` rows — one `default_win` for the opponent and one `default_win` for the challenger.

**Validates: Requirements 7.3, 7.4, 7.5**

---

### Property 19: Both check-ins trigger LIVE transition and battle creation

*For any* `BattleInvite` where both `challengerCheckedIn = true` and `opponentCheckedIn = true`, calling `tryGoLive(inviteId)` shall set `status = 'LIVE'` and insert exactly one row into the `battles` table.

**Validates: Requirements 8.1**

---

### Property 20: Participant count equals 2× count of LIVE battles

*For any* array of `LiveBattle` objects with mixed statuses, `computeParticipantCount(battles)` shall return exactly `2 × (count of battles where status === 'live')`.

**Validates: Requirements 8.2, 8.5**

---

### Property 21: Notifications sorted unread-first, then by recency

*For any* array of `AppNotification` objects with varying `read` states and `createdAt` timestamps, `sortAndGroupNotifications(notifications)` shall return a list where all unread notifications precede all read notifications, and within each group notifications are ordered by `createdAt` descending.

**Validates: Requirements 9.2**

---

### Property 22: All notification types produce a non-empty display message

*For any* `AppNotification` with type in `{ battle_request, battle_accepted, battle_declined, join_reminder, default_win }`, `renderNotificationMessage(notification)` shall return a non-empty string.

**Validates: Requirements 9.4**

---

### Property 23: Optimistic update sets isSubmitting synchronously before any async call

*For any* `BattleRequestScreen` or inline `Notification_Dropdown` action, tapping "Accept" or "Reject" shall set `isSubmitting = true` synchronously on the same event loop tick as the user interaction — before any asynchronous database call is initiated — and `isSubmitting` shall remain `true` until the async call resolves or rejects.

**Validates: Requirements 13.1, 13.2, 13.5**

---

### Property 24: computeUnreadCount returns exact count of unread notifications

*For any* `AppNotification[]`, `computeUnreadCount(notifications)` shall return `0` when all notifications have `read === true`, and shall return the exact count of notifications where `read === false` for any mixed array.

**Validates: Requirements 14.2, 14.3**

---

### Property 25: Notification_Dropdown renders exactly one Accept and one Reject button per battle_request notification

*For any* `Notification_Dropdown` rendered with an array of `AppNotification` objects, the rendered output shall contain exactly one "Accept" button and exactly one "Reject" button for each notification where `type === 'battle_request'`, and zero such buttons for notifications of any other type.

**Validates: Requirements 14.7**

---

## Error Handling

| Scenario | Handling |
|---|---|
| `createBattleRequest` called when PENDING invite already exists | Return `{ error: 'DUPLICATE_REQUEST' }`, no DB write |
| `acceptBattleRequest` / `rejectBattleRequest` on non-PENDING invite | Return `{ error: 'INVITE_NOT_PENDING' }`, display error message on `BattleRequestScreen` |
| Notification tapped but invite is already non-PENDING (stale state) | `app/page.tsx` re-fetches the invite from the DB before navigating to `BattleRequestScreen`; if the fetched status is not `PENDING`, the screen renders immediately in the error state via the existing `invite.status !== 'PENDING'` guard in `BattleRequestScreen` |
| `recordCheckin` called after `checkin_deadline` has passed | Return `{ error: 'CHECKIN_DEADLINE_EXPIRED' }`, trigger default-win flow |
| `tryGoLive` called but one user is not on socket | Return `{ error: 'NOT_BOTH_CONNECTED' }`, keep status as `ACCEPTED` |
| Supabase Realtime subscription drops | Client re-subscribes on reconnect using `supabase.channel().subscribe()` with exponential backoff |
| Edge Function `process-expired-invites` fails | Supabase logs the error; the function retries on the next cron tick (5 min) |
| Network error during `acceptBattleRequest` or `rejectBattleRequest` | Optimistic update (`isSubmitting = true`, buttons disabled) is rolled back synchronously; buttons re-enabled; user sees a descriptive error toast. The `notificationId` cleanup is skipped and the next polling cycle reconciles state. |
| Optimistic update applied but server returns `INVITE_NOT_PENDING` | Roll back `isSubmitting` to `false`, re-enable buttons, display "This request is no longer available" error message |
| `notificationId` cleanup fails while invite update succeeds | Log the inconsistency; next 10-second polling cycle re-fetches notifications and reconciles `read` state in `NotificationContext` |

---

## Notification Delivery Strategy

Notifications are delivered via a two-tier strategy to ensure reliability at zero additional cost.

### Primary: Supabase Realtime

`subscribeToNotifications(userId, onNew)` opens a `postgres_changes` subscription on the `notifications` table filtered by `user_id`. This is already implemented in `lib/db.ts` and used inside `NotificationsSection`. When a new notification row is inserted, the callback fires immediately and the badge count increments without any page refresh.

`subscribeToInvite(inviteId, onUpdate)` similarly subscribes to `invites` table changes for a specific invite, used by `WaitingPage` and `SentRequestsTab` to react to status transitions in real-time.

### Fallback: 10-Second API Polling

Supabase Realtime can miss events if the WebSocket connection drops or the subscription is not yet active when an event fires. To guard against this, the `NotificationContextProvider` runs a `setInterval` polling loop every 10 seconds that calls `getNotifications(userId)` and reconciles the result against context state.

**Implementation location:** `NotificationContextProvider` (mounted at layout level), **not** `app/page.tsx`. This ensures polling updates only touch context state and never cause layout shifts or re-renders in the main Dashboard area outside the `NotificationCenter` (Requirement 14.11).

```typescript
// Inside NotificationContextProvider
useEffect(() => {
  if (!userId) return;
  const intervalId = setInterval(async () => {
    try {
      const fresh = await getNotifications(userId);
      setNotifications(fresh);
    } catch (e) {
      console.error('[polling] getNotifications error:', e);
    }
  }, 10_000);
  return () => clearInterval(intervalId);
}, [userId]);
```

The polling interval is intentionally coarse (10 s) to avoid hammering the DB. Because `getNotifications` returns the full list ordered by `created_at DESC`, the reconciliation is a simple state replacement — no diffing required.

**Delivery guarantee summary:**

| Scenario | Delivery mechanism |
|---|---|
| Realtime subscription active | Supabase Realtime push (instant) |
| Subscription dropped / missed event | 10-second polling fallback |
| App backgrounded / tab hidden | Polling resumes on next tick after tab becomes active |

---

## Ghost Battle Prevention

### Problem

A battle invite with status `PENDING` or `ACCEPTED` represents an in-progress negotiation, not a confirmed live battle. If these invites are surfaced in the public Live Arena dashboard, users see "ghost battles" — battles that may never go live, cluttering the arena and inflating perceived activity.

### Rule

**Only battles with `status = 'LIVE'` (both players checked in) SHALL appear in the public arena view.**

This is enforced at two layers:

#### 1. `getBattles` query (`lib/db.ts`)

The `getBattles` function must filter to only return battles that are genuinely live or completed. Battles created speculatively from PENDING/ACCEPTED invites must not be returned.

The current `tryGoLive` function creates a battle row only when both check-ins are confirmed and sets `status = 'live'`. This means the `battles` table should only ever contain rows with `status = 'live'`, `'completed'`, or `'forfeited'`. However, the legacy `onCreateInvite` path in `app/page.tsx` still creates a battle row with `status = 'upcoming'` for public invites — this path must be removed or gated so it only fires after `tryGoLive` succeeds.

#### 2. `filterBattles` function (`lib/filters.ts`)

As a defence-in-depth measure, `filterBattles` must explicitly exclude any battle whose status is `PENDING` or `ACCEPTED` (invite-derived statuses that may leak into the battles table during the transition period):

```typescript
// In filterBattles, before the search/filter logic:
if (battle.status === 'PENDING' || battle.status === 'ACCEPTED') return false;
```

This ensures that even if a ghost battle row exists in the DB, it is never rendered in the arena list for any user other than the participants.

#### 3. Participant visibility exception

PENDING and ACCEPTED invites remain visible to the two participants via:
- The Challenger's `SentRequestsTab` (shows their own PENDING outgoing requests)
- The `WaitingPage` (shown to both after acceptance)
- The `NotificationsSection` (shows the `battle_request` / `join_reminder` notifications)

These views are scoped by `userId` / `userName` and are never part of the public arena list.

**Ghost battle prevention summary:**

| Invite status | Public arena visible? | Participant visible? |
|---|---|---|
| `PENDING` | No | Yes (SentRequestsTab, Notifications) |
| `ACCEPTED` | No | Yes (WaitingPage, Notifications) |
| `LIVE` | Yes | Yes |
| `ARCHIVED` / `REJECTED` | No | No |

---

## Database Migration Note

The `notifications` table migration file already exists at:

```
supabase/migrations/20240001000001_create_notifications_table.sql
```

**This migration must be applied before the notification features will work.** Until it is applied, `createNotification` and `getNotifications` will log a warning and degrade gracefully (returning empty arrays), but no notifications will be persisted or delivered.

To apply the migration, run:

```bash
supabase db push
# or, for local development:
supabase migration up
```

The `invites` table extension migration is at:

```
supabase/migrations/20240001000000_extend_invites_for_battle_requests.sql
```

Both migrations must be applied for the full battle-request-notifications feature to function correctly.

---

## Testing Strategy

### Unit Tests (example-based)

- `SentRequestsTab` renders empty state when no pending invites
- `BattleRequestScreen` renders Accept and Reject buttons with correct challenger info
- `WaitingPage` renders I_Am_Here_CTA for both challenger and opponent roles
- `NotificationsSection` renders empty state when notifications array is empty
- `NotificationBadge` renders correct count and hides when count is 0
- `NotificationCenter` renders bell icon in Dashboard header; badge hidden when unreadCount is 0
- `Notification_Dropdown` renders inline Accept/Reject buttons only for `battle_request` notifications
- `computeTimeRemaining` returns 0 for past deadlines
- `renderNotificationMessage` returns correct copy for each notification type

### Property-Based Tests (fast-check)

The project uses Vitest (`vitest --run`). Property-based tests use [fast-check](https://github.com/dubzzz/fast-check), which should be added as a dev dependency.

Each property test runs a minimum of 100 iterations. Tests are tagged with a comment referencing the design property.

**Tag format:** `// Feature: battle-request-notifications, Property N: <property_text>`

Properties 1–25 above each map to one property-based test. Key generators:

- `fc.record({ from: fc.string(), to: fc.string(), challenge: fc.string(), status: fc.constantFrom('PENDING','ACCEPTED','REJECTED','LIVE','ARCHIVED') })` — random invite
- `fc.array(notificationArb)` — random notification arrays
- `fc.integer({ min: Date.now(), max: Date.now() + 7_200_000 })` — future timestamps
- `fc.integer({ min: Date.now() - 7_200_000, max: Date.now() - 1 })` — past timestamps
- `fc.boolean()` — for `isSubmitting` state transitions (Property 23)
- `fc.array(fc.record({ read: fc.boolean() }))` — for `computeUnreadCount` (Property 24)
- `fc.array(notificationArb, { minLength: 1 })` filtered to include at least one `battle_request` — for `Notification_Dropdown` button count (Property 25)

### Integration Tests

- Supabase Realtime: inserting a `notifications` row triggers the `subscribeToNotifications` callback
- Supabase Realtime: updating an `invites` row triggers the `subscribeToInvite` callback
- Edge Function `process-expired-invites`: given an expired ACCEPTED invite, the function archives it and creates two notifications
- Both clients receive the `LIVE` status update and navigate to the battle screen

### Smoke Tests

- `notifications` table exists with correct schema
- `invites` table has `checkin_deadline`, `challenger_checked_in`, `opponent_checked_in` columns
- Unique index on `invites (from_name, to_name, challenge) WHERE status = 'PENDING'` is present
- Edge Function `process-expired-invites` is deployed and scheduled
