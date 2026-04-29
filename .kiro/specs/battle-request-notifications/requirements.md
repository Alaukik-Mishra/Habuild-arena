# Requirements Document

## Introduction

This feature implements a strict "Challenge-Response-Check-in" model for battle creation. Rather than immediately creating a live battle, the flow is gated across five phases: Initiation, Notification & Acceptance, Check-in, 1-Hour Countdown Logic, and Live Phase. A battle only appears in the Live Arena and only increments the Participant Count when both users have actively confirmed their presence via the "I am Here" CTA and are connected on the socket. This ensures every live battle represents two real, present participants.

## Glossary

- **Battle_Request_System**: The subsystem responsible for creating, routing, and resolving battle requests across all five phases.
- **Challenger**: The user who initiates a battle by selecting an opponent and tapping "Challenge." Also referred to as the sender.
- **Opponent**: The user who receives the battle request and must accept or reject it.
- **Battle_Request**: A database entry representing a pending challenge from a Challenger to an Opponent, stored with status `PENDING`.
- **Sent_Requests_Tab**: A tab on the Challenger's dashboard listing all outgoing Battle_Requests with status `PENDING`, showing a "Waiting for Acceptance" indicator for each.
- **Notification**: A real-time in-app alert delivered to a user's dashboard, informing them of a battle request or a status change.
- **Battle_Request_Screen**: The screen shown to the Opponent when they tap an incoming Notification, presenting Accept and Reject options.
- **Waiting_Page**: The screen shown to the Opponent immediately after they accept a Battle_Request. It displays the message "Waiting for the Challenger to arrive..." and a "Join Battle" CTA.
- **I_Am_Here_CTA**: A call-to-action button available to both the Challenger and the Opponent after acceptance, used to confirm active presence before the battle goes live.
- **Check_in**: The act of a user clicking the I_Am_Here_CTA, confirming they are present and connected on the socket.
- **Countdown_Timer**: A 60-minute countdown that starts when the Opponent accepts the Battle_Request, within which the Challenger must Check_in.
- **Default_Win**: An automatic victory awarded to the Opponent if the Challenger fails to Check_in before the Countdown_Timer expires.
- **Participant_Count**: The number of confirmed active participants in a live battle. This value is only incremented when both users have completed Check_in and are connected on the socket.
- **Live_Section**: The arena view displaying battles with status `LIVE`. A battle only appears here after both users have checked in.
- **Invite**: The existing data model in `types/index.ts` representing a battle invitation. The status field is extended to support `PENDING`, `ACCEPTED`, `REJECTED`, `CHECKED_IN_OPPONENT`, `LIVE`, and `ARCHIVED`.
- **Notification_Center**: A global, always-visible bell icon in the Dashboard header that displays the unread Notification count and opens a dropdown popover listing all active Notifications.
- **Notification_Context**: A React context provider mounted at the layout level that holds the Notifications list and unread count, making them accessible to all components regardless of the current page.
- **Optimistic_Update**: A UI technique where the interface reflects the result of an action immediately upon user interaction, before the server confirms the operation, to prevent duplicate submissions and improve perceived responsiveness.
- **Notification_Dropdown**: A floating, scrollable popover attached to the Notification_Center bell icon that renders all active Notifications with inline contextual action buttons.

## Requirements

### Requirement 1: Initiation Phase — Challenge Creates a PENDING Battle Request

**User Story:** As a Challenger, I want tapping "Challenge" on a lead to create a pending request rather than an immediate live battle, so that the arena only shows confirmed, active battles.

#### Acceptance Criteria

1. WHEN the Challenger selects an opponent from the database and taps "Challenge", THE Battle_Request_System SHALL create a Battle_Request entry with status `PENDING` and SHALL NOT create a live battle entry.
2. WHEN the Battle_Request is created, THE Battle_Request_System SHALL display the new Battle_Request in the Challenger's Sent_Requests_Tab with a "Waiting for Acceptance" status indicator.
3. WHEN the Battle_Request is created, THE Battle_Request_System SHALL NOT increment the Participant_Count for any battle.
4. WHEN the Battle_Request is created, THE Battle_Request_System SHALL NOT display the associated battle in the Live_Section or any arena battles list.
5. THE Battle_Request_System SHALL prevent the Challenger from submitting a duplicate Battle_Request to the same Opponent for the same challenge while a `PENDING` request already exists.

### Requirement 2: Sent Requests Tab for the Challenger

**User Story:** As a Challenger, I want a dedicated tab showing all my outgoing pending requests, so that I can track which challenges are awaiting a response.

#### Acceptance Criteria

1. THE Sent_Requests_Tab SHALL display all Battle_Requests where the current user is the Challenger and the status is `PENDING`.
2. THE Sent_Requests_Tab SHALL display, for each pending request: the Opponent's name, the challenge name, the time the request was sent, and a "Waiting for Acceptance" status label.
3. WHEN a Battle_Request status changes from `PENDING` to `ACCEPTED` or `REJECTED`, THE Sent_Requests_Tab SHALL update in real-time to reflect the new status and remove the request from the pending list.
4. WHEN the Sent_Requests_Tab contains no pending requests, THE Sent_Requests_Tab SHALL display an empty state message.

### Requirement 3: Notification & Acceptance Phase — Opponent Receives a Real-Time Notification

**User Story:** As an Opponent, I want to receive a real-time notification when someone challenges me, so that I can respond promptly without polling the app.

#### Acceptance Criteria

1. WHEN a Battle_Request is created targeting an Opponent, THE Battle_Request_System SHALL deliver a real-time Notification to the Opponent's dashboard without requiring a page refresh.
2. WHEN the Opponent receives a Notification, THE Notification SHALL include the Challenger's name, the challenge name, and a link to the Battle_Request_Screen.
3. THE Dashboard SHALL display a badge count on the navigation indicating the number of unread Notifications.
4. WHEN the Opponent views a Notification, THE Battle_Request_System SHALL mark that Notification as read and SHALL decrement the badge count accordingly.

### Requirement 4: Notification & Acceptance Phase — Opponent Accepts or Rejects the Request

**User Story:** As an Opponent, I want to accept or reject a battle request from the Battle Request Screen, so that I have full control over which battles I participate in.

#### Acceptance Criteria

1. WHEN the Opponent taps an incoming battle Notification, THE Battle_Request_System SHALL navigate the Opponent to the Battle_Request_Screen displaying the Challenger's name, the challenge name, an "Accept" button, and a "Reject" button.
2. WHEN the Opponent taps "Accept", THE Battle_Request_System SHALL update the Battle_Request status to `ACCEPTED` and SHALL NOT yet create a live battle entry or increment the Participant_Count.
3. WHEN the Opponent taps "Accept", THE Battle_Request_System SHALL redirect the Opponent to the Waiting_Page, which SHALL display the message "Waiting for the Challenger to arrive..." and the I_Am_Here_CTA.
4. WHEN the Opponent taps "Reject", THE Battle_Request_System SHALL update the Battle_Request status to `REJECTED` and SHALL archive the entry.
5. WHEN the Opponent taps "Reject", THE Battle_Request_System SHALL NOT create a battle entry and SHALL NOT increment the Participant_Count.
6. IF the Battle_Request has already been accepted or rejected by the time the Opponent taps a response button, THEN THE Battle_Request_System SHALL display an error message indicating the request is no longer valid.

### Requirement 5: Notification & Acceptance Phase — Sender Receives Rejection Notification

**User Story:** As a Challenger, I want to be notified in real-time when my battle request is rejected, so that I know the battle will not happen and can challenge someone else.

#### Acceptance Criteria

1. WHEN the Opponent rejects a Battle_Request, THE Battle_Request_System SHALL deliver a real-time Notification to the Challenger stating "Battle Declined" along with the Opponent's name and the challenge name.
2. WHEN the Challenger views the rejection Notification, THE Battle_Request_System SHALL mark it as read and SHALL remove the corresponding entry from the Sent_Requests_Tab.
3. WHEN the Opponent rejects a Battle_Request, THE Battle_Request_System SHALL archive the Battle_Request entry with status `REJECTED`.

### Requirement 6: Check-in Phase — Both Users Must Confirm Presence

**User Story:** As a user, I want to confirm my presence with an "I am Here" action before the battle starts, so that the arena only shows battles where both participants are genuinely active.

#### Acceptance Criteria

1. WHEN the Opponent accepts a Battle_Request, THE Battle_Request_System SHALL deliver a real-time Notification to the Challenger stating "Challenge Accepted! Join within 1 hour" and SHALL display the I_Am_Here_CTA on the Challenger's dashboard.
2. WHEN the Opponent accepts a Battle_Request, THE Waiting_Page SHALL display the I_Am_Here_CTA to the Opponent alongside the message "Waiting for the Challenger to arrive..."
3. WHEN the Challenger clicks the I_Am_Here_CTA, THE Battle_Request_System SHALL record the Challenger's Check_in and SHALL verify the Challenger is connected on the socket.
4. WHEN the Opponent clicks the I_Am_Here_CTA on the Waiting_Page, THE Battle_Request_System SHALL record the Opponent's Check_in and SHALL verify the Opponent is connected on the socket.
5. WHILE only one user has completed Check_in, THE Battle_Request_System SHALL NOT move the battle to the Live_Section and SHALL NOT increment the Participant_Count.

### Requirement 7: 1-Hour Countdown Logic — Default Win on Challenger No-Show

**User Story:** As an Opponent, I want to automatically win if the Challenger doesn't show up within an hour of my acceptance, so that I am not left waiting indefinitely on the Waiting Page.

#### Acceptance Criteria

1. WHEN the Opponent accepts a Battle_Request, THE Battle_Request_System SHALL start a Countdown_Timer of 60 minutes.
2. WHILE the Countdown_Timer is active, THE Waiting_Page SHALL display the remaining time to the Opponent.
3. IF the Countdown_Timer expires before the Challenger completes Check_in, THEN THE Battle_Request_System SHALL award a Default_Win to the Opponent.
4. WHEN a Default_Win is awarded, THE Battle_Request_System SHALL deliver a Notification to both users: the Opponent receives "You won by default — Challenger did not arrive in time" and the Challenger receives "You forfeited — you did not join within the 1-hour window."
5. WHEN a Default_Win is awarded, THE Battle_Request_System SHALL archive the Battle_Request and SHALL NOT move the battle to the Live_Section.
6. IF the Challenger completes Check_in before the Countdown_Timer expires, THEN THE Battle_Request_System SHALL stop the Countdown_Timer.

### Requirement 8: Live Phase — Battle Goes Live Only When Both Users Are Checked In

**User Story:** As a user, I want the battle to appear in the Live Section only when both participants have confirmed their presence and are on the socket, so that every live battle represents two real, active people.

#### Acceptance Criteria

1. WHEN both the Challenger and the Opponent have completed Check_in and both are confirmed on the socket connection, THE Battle_Request_System SHALL update the Battle_Request status to `LIVE` and SHALL create a live battle entry visible in the Live_Section.
2. WHEN the battle status is set to `LIVE`, THE Battle_Request_System SHALL increment the Participant_Count by two to reflect both confirmed participants.
3. WHEN the battle status is set to `LIVE`, THE Battle_Request_System SHALL navigate both users to the active battle screen simultaneously.
4. WHILE a Battle_Request has any status other than `LIVE`, THE Battle_Request_System SHALL NOT display the associated battle in the Live_Section or increment the Participant_Count.
5. THE Battle_Request_System SHALL derive the Participant_Count solely from battles with status `LIVE` where both users have an active socket connection.

### Requirement 9: Notifications Section in the Dashboard

**User Story:** As a user, I want a dedicated Notifications section in the dashboard, so that I can see all battle-related alerts in one place and act on them.

#### Acceptance Criteria

1. THE Dashboard SHALL include a Notifications section accessible from the main navigation displaying a badge count of unread Notifications.
2. THE Notifications section SHALL display all Notifications for the current user ordered by most recent first, grouped into unread and read.
3. WHEN the Notifications section contains no Notifications, THE Notifications section SHALL display an empty state message.
4. THE Notifications section SHALL support the following Notification types: `battle_request` (incoming challenge), `battle_accepted` (Challenger's request was accepted), `battle_declined` (Challenger's request was rejected), `join_reminder` (Challenger must join within 1 hour), and `default_win` (awarded to Opponent on Challenger no-show).
5. WHEN a real-time event occurs that generates a Notification, THE Battle_Request_System SHALL deliver the Notification without requiring the recipient to refresh the page.

### Requirement 10: Ghost Battle Prevention — Only LIVE Battles Appear in the Public Arena

**User Story:** As a user browsing the Live Arena, I want to see only battles where both participants have confirmed their presence, so that the arena does not show ghost battles that may never start.

#### Acceptance Criteria

1. WHEN the arena battle list is rendered, THE Battle_Request_System SHALL display only battles with status `LIVE` in the public arena view; battles with status `PENDING` or `ACCEPTED` SHALL NOT appear in the list for any user other than the participants.
2. THE `filterBattles` function in `lib/filters.ts` SHALL exclude any battle whose status is `PENDING` or `ACCEPTED` before applying any other filter or search logic.
3. THE `getBattles` query SHALL NOT return battle rows that correspond to unconfirmed invites; battle rows SHALL only be created by `tryGoLive` after both check-ins are confirmed.
4. WHEN a Challenger creates a Battle_Request, THE Battle_Request_System SHALL NOT create a battle row in the `battles` table; the battle row SHALL only be created when `tryGoLive` succeeds.

### Requirement 11: Notification Delivery Reliability — Polling Fallback

**User Story:** As a user, I want to receive notifications even if the real-time WebSocket connection drops or misses an event, so that I never miss a battle request or status update.

#### Acceptance Criteria

1. THE Dashboard SHALL poll `getNotifications(userId)` every 10 seconds as a fallback delivery mechanism while the user is logged in.
2. WHEN the polling interval fires, THE Battle_Request_System SHALL replace the local notifications state with the fresh result from the database, ensuring any missed real-time events are recovered within 10 seconds.
3. THE polling interval SHALL be cleaned up when the user logs out or the component unmounts.
4. THE Supabase Realtime subscription (`subscribeToNotifications`) SHALL remain the primary delivery mechanism; polling is additive and SHALL NOT replace the real-time subscription.

### Requirement 12: Stale Invite Handling — Re-fetch Before Showing Battle Request Screen

**User Story:** As an Opponent, I want the Battle Request Screen to reflect the current state of the invite when I tap a notification, so that I do not see Accept/Reject buttons for a request that has already been handled.

#### Acceptance Criteria

1. WHEN the Opponent taps a `battle_request` notification, THE Battle_Request_System SHALL re-fetch the invite from the database before navigating to the `BattleRequestScreen`, to ensure the displayed status is current.
2. IF the re-fetched invite has a status other than `PENDING`, THEN THE `BattleRequestScreen` SHALL display the "This request is no longer available" error message immediately, without showing the Accept/Reject buttons.
3. THE re-fetch SHALL use a `getInviteById(inviteId)` database function that returns the current invite row mapped to a `BattleInvite` object.

### Requirement 13: Optimistic Updates — Prevent Duplicate Action Submissions

**User Story:** As an Opponent, I want the Accept and Reject buttons to become immediately unresponsive after I tap them, so that I cannot accidentally trigger the same action twice and cause an `INVITE_NOT_PENDING` error.

#### Acceptance Criteria

1. WHEN the Opponent taps "Accept" or "Reject" on the `BattleRequestScreen`, THE Battle_Request_System SHALL immediately apply an Optimistic_Update that disables both action buttons and replaces the tapped button's label with a loading spinner.
2. WHILE an accept or reject request is in-flight, THE `BattleRequestScreen` SHALL prevent any further taps on either action button.
3. IF the server returns an error for the accept or reject request, THEN THE Battle_Request_System SHALL roll back the Optimistic_Update, re-enable the action buttons, and display a descriptive error message to the Opponent.
4. WHEN the server confirms the accept or reject request, THE Battle_Request_System SHALL retain the disabled state and navigate the Opponent to the appropriate next screen without re-enabling the buttons.
5. THE Optimistic_Update SHALL be applied synchronously on the same event loop tick as the user interaction, before any asynchronous database call is initiated.

### Requirement 14: Global Notification Center — Bell Icon in the Dashboard Header

**User Story:** As a user, I want a persistent bell icon in the Dashboard header that shows my unread notification count and opens a dropdown with all my active notifications, so that I can stay informed and act on battle requests from any page without navigating away.

#### Acceptance Criteria

1. THE Dashboard header SHALL display a Notification_Center bell icon in the top-right corner that is visible on all pages of the Dashboard.
2. WHEN the unread Notification count is greater than zero, THE Notification_Center SHALL display a red badge overlaid on the bell icon showing the exact unread count.
3. WHEN the unread Notification count is zero, THE Notification_Center SHALL hide the red badge entirely.
4. WHEN the user taps the bell icon, THE Notification_Center SHALL open the Notification_Dropdown as a floating popover anchored to the bell icon.
5. THE Notification_Dropdown SHALL be scrollable and SHALL display all active Notifications for the current user ordered by most recent first.
6. WHEN the Notification_Dropdown is open and the user taps outside of it, THE Notification_Center SHALL close the Notification_Dropdown.
7. FOR each `battle_request` Notification displayed in the Notification_Dropdown, THE Notification_Dropdown SHALL render an inline "Accept" button and an inline "Reject" button alongside the notification message.
8. WHEN the user taps "Accept" or "Reject" inside the Notification_Dropdown, THE Battle_Request_System SHALL apply an Optimistic_Update (per Requirement 13) and process the action without closing or navigating away from the current page.
9. THE Notification_Center SHALL source its Notifications and unread count from the Notification_Context so that the badge count remains accurate regardless of which page the user is currently viewing.
10. THE Notification_Context SHALL be mounted at the layout level (e.g., in `app/layout.tsx` or a top-level provider component) so that all pages share a single Notifications state.
11. WHEN the polling interval fires (per Requirement 11), THE Battle_Request_System SHALL update only the Notification_Context state; the update SHALL NOT cause any layout shift or re-render in the main Dashboard area outside the Notification_Center.

### Requirement 15: Notification Cleanup — Remove or Archive Notifications After Action

**User Story:** As a user, I want accepted or rejected battle request notifications to disappear after I act on them, so that my notification list stays clean and I do not see stale entries on the next poll.

#### Acceptance Criteria

1. WHEN the Opponent accepts a Battle_Request, THE Battle_Request_System SHALL either delete the corresponding `battle_request` Notification row from the `notifications` table or set its `read` field to `true`, so that the Notification does not reappear on the next polling cycle.
2. WHEN the Opponent rejects a Battle_Request, THE Battle_Request_System SHALL either delete the corresponding `battle_request` Notification row from the `notifications` table or set its `read` field to `true`, so that the Notification does not reappear on the next polling cycle.
3. WHEN a Notification is removed or marked as read following an accept or reject action, THE Notification_Center badge count SHALL decrement immediately via the Optimistic_Update applied in Requirement 13.
4. THE cleanup operation (delete or mark-as-read) SHALL be performed as part of the same database transaction as the `acceptBattleRequest` or `rejectBattleRequest` call, so that the notification state and the invite state remain consistent.
5. IF the cleanup operation fails while the invite update succeeds, THEN THE Battle_Request_System SHALL log the inconsistency and the next polling cycle SHALL reconcile the Notification_Center state by re-fetching from the database.
