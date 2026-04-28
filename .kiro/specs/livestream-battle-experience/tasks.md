# Tasks: Livestream Battle Experience

## Task List

- [x] 1. Extend types and DB layer
  - [x] 1.1 Add new types to `types/index.ts`: `GiftType`, `GiftEffect`, `FloatingReaction`, `RepPulseEvent`, and all broadcast payload interfaces (`RepPulseBroadcast`, `ReactionBroadcast`, `GiftBroadcast`, `PollVoteBroadcast`, `SpectatorCountBroadcast`)
  - [x] 1.2 Extend `LiveBattle` interface in `types/index.ts` with optional fields `spectatorCount?: number`
  - [x] 1.3 Add `GIFT_COSTS` constant and `GiftType` type to a new `lib/giftLogic.ts` file
  - [x] 1.4 Add `subscribeLivestreamChannel` function to `lib/db.ts` that subscribes to Supabase Broadcast on `battle:{id}` and routes typed events to handler callbacks
  - [x] 1.5 Add `sendGift` async function to `lib/db.ts` that inserts into `battle_gifts`, deducts coins from `profiles`, and broadcasts the gift event
  - [x] 1.6 Add `castPollVote` async function to `lib/db.ts` that inserts into `battle_poll_votes` and broadcasts updated vote totals
  - [x] 1.7 Add `getPollVotes` async function to `lib/db.ts` that fetches current vote counts for a battle

- [x] 2. Add CSS animations to globals
  - [x] 2.1 Add `@keyframes repPulse` animation (scale 0 → 1.5 → 0, opacity 1 → 0) to `app/globals.css`
  - [x] 2.2 Add `@keyframes floatUp` animation (translateY 0 → -120px, opacity 1 → 0) to `app/globals.css`
  - [x] 2.3 Add `@keyframes giftOverlay` animation (opacity 0 → 1 → 1 → 0 with scale) to `app/globals.css`
  - [x] 2.4 Register the new keyframes as Tailwind utility classes (`animate-rep-pulse`, `animate-float-up`, `animate-gift-overlay`) via the Tailwind config or CSS layer

- [x] 3. Build `RepPulse` component
  - [x] 3.1 Create `components/livestream/RepPulse.tsx` that accepts `pulses: RepPulseEvent[]` and `side: 'p1' | 'p2'`
  - [x] 3.2 Render each pulse as an absolutely-positioned burst element using `animate-rep-pulse`
  - [x] 3.3 Auto-remove pulse entries from local state after 600ms using `setTimeout` cleanup

- [x] 4. Build `CrowdMomentum` component
  - [x] 4.1 Create `components/livestream/CrowdMomentum.tsx` that accepts `p1Name`, `p2Name`, and `momentumScore: number`
  - [x] 4.2 Render a split horizontal bar with blue (p1) and red (p2) sides, width driven by `momentumScore`
  - [x] 4.3 Show "CROWD WITH {name}" label when score > 65 or < 35
  - [x] 4.4 Apply pulse animation to the dominant side when threshold is crossed

- [x] 5. Build `HypeReactions` component
  - [x] 5.1 Create `components/livestream/HypeReactions.tsx` that accepts `reactions: FloatingReaction[]` and `onReact: (emoji: string) => void`
  - [x] 5.2 Render the emoji tray (🔥👑😂😡😭) as 3D tactile buttons matching the app design spine
  - [x] 5.3 Render each active `FloatingReaction` as an absolutely-positioned element using `animate-float-up` at its `x` position
  - [x] 5.4 Auto-remove reactions from state after 1500ms
  - [x] 5.5 Cap visible reactions at 20; remove oldest when exceeded

- [x] 6. Build `GiftEffect` component
  - [x] 6.1 Create `components/livestream/GiftEffect.tsx` that accepts `effect: GiftEffect | null` and `onComplete: () => void`
  - [x] 6.2 Render a full-screen overlay with `animate-gift-overlay` showing gift emoji, type label, and sender name
  - [x] 6.3 Call `onComplete` after animation duration (2500ms) using `setTimeout`

- [x] 7. Build `PredictionPoll` component
  - [x] 7.1 Create `components/livestream/PredictionPoll.tsx` that accepts `p1Name`, `p2Name`, `votes`, `myVote`, and `onVote`
  - [x] 7.2 Render two vote bars with live percentage widths using CSS `transition-all`
  - [x] 7.3 Disable vote buttons after `myVote` is set; highlight the chosen fighter
  - [x] 7.4 Display total vote count below the bars

- [x] 8. Build `GiftTray` component
  - [x] 8.1 Create `components/livestream/GiftTray.tsx` that accepts `onSendGift`, `userPoints`, and `isLive`
  - [x] 8.2 Render gift options (Confetti 10🪙, Fire 15🪙, Lightning 25🪙, Crown 50🪙) as 3D tactile buttons
  - [x] 8.3 Visually dim and disable gift buttons when `userPoints < giftCost`
  - [x] 8.4 Show "Not enough coins" inline message on tap when balance is insufficient

- [x] 9. Extend `LiveBattlePage` with livestream orchestration
  - [x] 9.1 Add `bettingLocked` derived state: `true` when `battle.status === 'live' || battle.status === 'completed'`
  - [x] 9.2 Replace bet buttons with a "BETTING CLOSED 🔒" badge when `bettingLocked` is true
  - [x] 9.3 Add `useEffect` that calls `subscribeLivestreamChannel` when `battle.status === 'live'`, routing events to local state setters
  - [x] 9.4 Add `repPulses` state and handler: on `rep_pulse` event, append to array and update `momentumScore`
  - [x] 9.5 Add `momentumScore` state (initial 50) with `updateMomentum` logic and a 2-second decay interval
  - [x] 9.6 Add `floatingReactions` state and `handleReact` function that broadcasts and appends to local state with debounce (300ms)
  - [x] 9.7 Add `giftQueue` state and `activeGiftEffect` state; dequeue next effect when `onComplete` fires; cap queue at 5
  - [x] 9.8 Add `pollVotes` and `myPollVote` state; load initial votes via `getPollVotes` on mount; update on `poll_vote` broadcast
  - [x] 9.9 Add `spectatorCount` state updated via `spectator_count` broadcast events; display in header
  - [x] 9.10 Mount `RepPulse`, `CrowdMomentum`, `HypeReactions`, `GiftEffect`, `PredictionPoll`, and `GiftTray` components in the live engagement section, below the player scoreboard and above comments
  - [x] 9.11 Ensure all new `useEffect` hooks return cleanup functions that unsubscribe channels and clear intervals

- [x] 10. Wire up rep pulse broadcasting from `Battle.tsx`
  - [x] 10.1 In `Battle.tsx`, after `updateBattle` is called with new rep counts, detect the delta and call `subscribeLivestreamChannel`'s broadcast helper (or a standalone `broadcastRepPulse` utility) to emit `rep_pulse` events on the battle channel

- [x] 11. Database migrations
  - [x] 11.1 Create SQL migration for `battle_gifts` table with columns: `id`, `battle_id`, `sender_name`, `gift_type`, `coin_cost`, `created_at`
  - [x] 11.2 Create SQL migration for `battle_poll_votes` table with columns: `id`, `battle_id`, `voter_name`, `voted_for`, `created_at`, and `UNIQUE(battle_id, voter_name)` constraint
  - [x] 11.3 Add Supabase RLS policies: spectators can INSERT into `battle_gifts` and `battle_poll_votes` for their own `sender_name`/`voter_name`; SELECT is open for authenticated users

- [x] 12. Integration and validation
  - [x] 12.1 Verify that existing `subscribeToBattle` in `lib/db.ts` is untouched and still functions for rep count updates
  - [x] 12.2 Verify that `Dashboard.tsx` betting UI for `"upcoming"` and `"completed"` battles is unaffected
  - [x] 12.3 Verify that `LiveBattle` type extensions are backward-compatible (all new fields are optional)
  - [x] 12.4 Test betting lock: navigate to a live battle and confirm bet buttons are replaced by the locked badge
  - [x] 12.5 Test gift flow: send a gift, confirm coins deducted, DB row inserted, and overlay animation plays
