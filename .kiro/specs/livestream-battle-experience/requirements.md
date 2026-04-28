# Requirements: Livestream Battle Experience

## Introduction

This document defines the functional requirements for the Livestream Battle Experience feature. The feature transforms the existing `LiveBattlePage` spectator view into a real-time stadium atmosphere using Supabase Realtime broadcast channels — no video streaming. It introduces betting locks, crowd prediction polls, Rep Pulse animations, a Crowd Momentum meter, floating emoji reactions, and a Gifts mechanic, all layered on top of the existing Supabase backend without breaking existing `battles`, `profiles`, or `bets` logic.

---

## Requirements

### Requirement 1: Betting Lock on Live Status

**User Story**: As a spectator, when a battle goes live, I want betting to be automatically locked so that the outcome cannot be influenced after the battle has started.

#### Acceptance Criteria

1.1 WHEN a battle's `status` field transitions to `"live"` via Supabase Realtime, THEN all bet buttons SHALL be hidden and replaced with a "BETTING CLOSED" indicator.

1.2 WHEN `battle.status === "live"`, THEN `battle.bettingOpen` SHALL be `false` and no bet placement action SHALL be executable by the client.

1.3 WHEN betting is locked, THEN any previously placed bet SHALL remain visible as a read-only record.

1.4 WHEN a battle transitions from `"upcoming"` to `"live"`, THEN the live engagement panel (Rep Pulse, Crowd Momentum, Prediction Poll) SHALL mount automatically without requiring a page reload.

---

### Requirement 2: "Who Will Win" Crowd Prediction Poll

**User Story**: As a spectator watching a live battle, I want to vote on who I think will win so that I can participate in the crowd energy.

#### Acceptance Criteria

2.1 WHEN `battle.status === "live"`, THEN a prediction poll SHALL be displayed showing both fighters with their current vote percentages.

2.2 WHEN a spectator casts a vote, THEN the vote SHALL be persisted to `battle_poll_votes` and broadcast to all connected spectators via Supabase Broadcast.

2.3 WHEN a spectator has already voted, THEN the vote buttons SHALL be disabled and their chosen fighter SHALL be visually highlighted.

2.4 WHEN any spectator casts a vote, THEN all connected spectators SHALL see the updated vote percentages in real time without a page reload.

2.5 WHEN a spectator attempts to vote twice for the same battle, THEN the second vote SHALL be rejected (enforced by a `UNIQUE(battle_id, voter_name)` database constraint).

2.6 WHEN the battle ends (`status === "completed"` or `"forfeited"`), THEN the poll SHALL display final results in a read-only state.

---

### Requirement 3: Rep Pulse Animations

**User Story**: As a spectator, I want to see a visual burst animation every time a fighter completes a rep so that I feel the energy of the battle in real time.

#### Acceptance Criteria

3.1 WHEN `p1Reps` or `p2Reps` increases by any positive delta via a Supabase Realtime update, THEN a `rep_pulse` broadcast event SHALL be emitted on the battle's channel.

3.2 WHEN a `rep_pulse` event is received, THEN a burst animation SHALL appear on the corresponding fighter's side of the scoreboard.

3.3 WHEN the rep delta is zero (no new reps), THEN no `rep_pulse` event SHALL be broadcast.

3.4 WHEN multiple reps are recorded in a single update (delta > 1), THEN the pulse animation SHALL visually reflect the magnitude (e.g., larger burst for higher delta).

3.5 WHEN a pulse animation completes (~600ms), THEN it SHALL be automatically removed from the DOM.

---

### Requirement 4: Crowd Momentum Meter

**User Story**: As a spectator, I want to see a live momentum meter that shows which fighter the crowd is rallying behind so that I can feel the stadium energy shift.

#### Acceptance Criteria

4.1 WHEN the livestream panel is active, THEN a horizontal momentum meter SHALL be displayed showing a 0–100 score split between both fighters.

4.2 WHEN a `rep_pulse` event is received for a fighter, THEN the momentum score SHALL shift toward that fighter by `repDelta × 3` points, clamped to [0, 100].

4.3 WHEN no rep pulses are received for 2 seconds, THEN the momentum score SHALL decay toward the neutral value of 50 at a rate of 5% per interval.

4.4 WHEN the momentum score exceeds 65 (p1 dominant) or falls below 35 (p2 dominant), THEN the dominant side SHALL pulse visually and display "CROWD WITH {name}".

4.5 AT ALL TIMES, the momentum score SHALL remain within the range [0, 100].

---

### Requirement 5: Floating Emoji Hype Reactions

**User Story**: As a spectator, I want to tap emoji reactions that float up the screen so that I can express my excitement in real time alongside other spectators.

#### Acceptance Criteria

5.1 WHEN the livestream panel is active, THEN an emoji tray SHALL be displayed at the bottom of the screen with at least 5 emoji options (🔥👑😂😡😭).

5.2 WHEN a spectator taps an emoji, THEN a `reaction` broadcast event SHALL be sent to all spectators on the battle channel.

5.3 WHEN a `reaction` broadcast event is received, THEN a floating emoji SHALL animate upward from a randomized horizontal position and fade out over ~1.5 seconds.

5.4 WHEN a spectator taps the same emoji repeatedly, THEN sends SHALL be debounced to a maximum of 1 per 300ms to prevent channel flooding.

5.5 WHEN more than 20 floating reactions are active simultaneously, THEN the oldest reactions SHALL be removed first to prevent DOM accumulation.

---

### Requirement 6: Gifts Mechanic

**User Story**: As a spectator, I want to spend coins to send a gift that triggers a visual screen effect for all spectators so that I can make a big moment in the battle.

#### Acceptance Criteria

6.1 WHEN the livestream panel is active, THEN a gift tray SHALL be displayed showing available gift types with their coin costs: Confetti (10🪙), Fire (15🪙), Lightning (25🪙), Crown (50🪙).

6.2 WHEN a spectator taps a gift and has sufficient coins, THEN the coin cost SHALL be deducted from their `profiles.coins` balance and a `gift` broadcast event SHALL be sent to all spectators.

6.3 WHEN a spectator taps a gift but has insufficient coins, THEN an inline "Not enough coins" message SHALL be shown and no coins SHALL be deducted.

6.4 WHEN a `gift` broadcast event is received, THEN a full-screen visual overlay animation SHALL play for 2–3 seconds showing the gift type and sender's name.

6.5 WHEN multiple gift events arrive simultaneously, THEN they SHALL be queued and played one at a time in FIFO order.

6.6 WHEN the gift queue exceeds 5 pending effects, THEN the oldest unplayed effects beyond the cap SHALL be dropped (visual only; DB records are preserved).

6.7 WHEN a gift is sent, THEN it SHALL be persisted to the `battle_gifts` table with `battle_id`, `sender_name`, `gift_type`, and `coin_cost`.

---

### Requirement 7: Supabase Realtime Integration

**User Story**: As a developer, I want all livestream features to be powered by Supabase Realtime so that the experience is low-latency and consistent with the existing backend architecture.

#### Acceptance Criteria

7.1 WHEN a battle is live, THEN a single Supabase Broadcast channel (`battle:{id}`) SHALL be subscribed to for all livestream events (`rep_pulse`, `reaction`, `gift`, `poll_vote`, `spectator_count`).

7.2 WHEN the `LiveBattlePage` component unmounts, THEN the Broadcast channel SHALL be unsubscribed and removed to prevent memory leaks.

7.3 WHEN the Realtime connection drops and reconnects, THEN the channel SHALL automatically re-subscribe without requiring user action.

7.4 WHEN a spectator joins the live battle page, THEN a `spectator_count` broadcast SHALL be emitted and the current spectator count SHALL be displayed in the header.

7.5 WHEN a spectator leaves the live battle page, THEN the spectator count SHALL be decremented via a presence leave event.

---

### Requirement 8: Design System Consistency

**User Story**: As a user, I want the livestream UI to feel visually consistent with the rest of the app so that the experience feels cohesive.

#### Acceptance Criteria

8.1 All new typography in the livestream panel SHALL use `font-serif` with `italic` styling for headings and labels, consistent with existing components.

8.2 All new interactive buttons SHALL use the 3D tactile style: `shadow-[0_Npx_0_color]` with `active:shadow-none active:translate-y-[Npx] transition-all`.

8.3 All new containers SHALL use soft-shadow styling: `bg-white border-2 border-gray-100 rounded-2xl shadow-sm`.

8.4 The existing `LiveBattlePage` layout, header, player scoreboard, and comment section SHALL remain structurally unchanged; new components SHALL be inserted as additional sections.

8.5 All new CSS animations (pulse, float, gift overlay) SHALL be defined as Tailwind keyframes in `app/globals.css` and SHALL use `transform` and `opacity` only (no layout-affecting properties) for GPU compositing.

---

### Requirement 9: Backward Compatibility

**User Story**: As a developer, I want the new feature to preserve all existing backend logic so that nothing breaks for current users.

#### Acceptance Criteria

9.1 The existing `subscribeToBattle` function in `lib/db.ts` SHALL NOT be modified; the new `subscribeLivestreamChannel` function SHALL be additive.

9.2 The existing `battles`, `profiles`, `bets`, `invites`, `friend_requests`, and `chat_messages` tables SHALL NOT have columns removed or renamed.

9.3 The existing `LiveBattle` TypeScript interface SHALL be extended with optional fields only (`spectatorCount?`, `momentumScore?`) so that existing code remains type-safe without changes.

9.4 The existing `BET_AMOUNT` constant and `resolveBet` logic in `lib/betLogic.ts` SHALL remain unchanged.

9.5 The `Dashboard.tsx` battle card betting UI SHALL continue to function identically for `"upcoming"` and `"completed"` battles.
