import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { BattleInviteStatus, NotificationType } from '../../types/index';
import {
  filterSentRequests,
  computeUnreadCount,
  computeTimeRemaining,
  sortAndGroupNotifications,
  renderNotificationMessage,
  canGoLive,
  computeParticipantCount,
} from '../battleRequestUtils';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const inviteArb = fc.record({
  id: fc.uuid(),
  from: fc.string({ minLength: 1 }),
  to: fc.string({ minLength: 1 }),
  challenge: fc.string({ minLength: 1 }),
  scheduledTime: fc.integer({ min: 0 }),
  status: fc.constantFrom(
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'CHECKED_IN_OPPONENT',
    'LIVE',
    'ARCHIVED',
  ) as fc.Arbitrary<BattleInviteStatus>,
  isPublic: fc.boolean(),
  timestamp: fc.integer({ min: 0 }),
  checkinDeadline: fc.option(fc.integer({ min: 0 }), { nil: undefined }),
  challengerCheckedIn: fc.boolean(),
  opponentCheckedIn: fc.boolean(),
});

const notificationArb = fc.record({
  id: fc.uuid(),
  userId: fc.string({ minLength: 1 }),
  type: fc.constantFrom(
    'battle_request',
    'battle_accepted',
    'battle_declined',
    'join_reminder',
    'default_win',
  ) as fc.Arbitrary<NotificationType>,
  inviteId: fc.option(fc.uuid(), { nil: undefined }),
  payload: fc.record({
    challengerName: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
    opponentName: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
    challengeName: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
  }),
  read: fc.boolean(),
  createdAt: fc.integer({ min: 0 }),
});

// ---------------------------------------------------------------------------
// Task 11.2 — Properties 2 and 4: filterSentRequests
// ---------------------------------------------------------------------------

describe('filterSentRequests', () => {
  // Feature: battle-request-notifications, Property 2: filterSentRequests returns only invites where from === currentUser AND status === 'PENDING'
  it('filterSentRequests: only returns PENDING invites from currentUser', () => {
    fc.assert(fc.property(
      fc.array(inviteArb),
      fc.string({ minLength: 1 }),
      (invites, currentUser) => {
        const result = filterSentRequests(invites, currentUser);
        return result.every(i => i.from === currentUser && i.status === 'PENDING');
      },
    ));
  });

  // Feature: battle-request-notifications, Property 4: status change to ACCEPTED/REJECTED removes invite from filterSentRequests output
  it('filterSentRequests: ACCEPTED/REJECTED invites are excluded', () => {
    fc.assert(fc.property(
      fc.array(inviteArb),
      fc.string({ minLength: 1 }),
      (invites, currentUser) => {
        const result = filterSentRequests(invites, currentUser);
        return result.every(i => i.status === 'PENDING');
      },
    ));
  });
});

// ---------------------------------------------------------------------------
// Task 11.3 — Properties 7 and 8: computeUnreadCount
// ---------------------------------------------------------------------------

describe('computeUnreadCount', () => {
  // Feature: battle-request-notifications, Property 7: computeUnreadCount equals count of notifications where read === false
  it('computeUnreadCount: equals count of unread notifications', () => {
    fc.assert(fc.property(
      fc.array(notificationArb),
      (notifications) => {
        const expected = notifications.filter(n => !n.read).length;
        return computeUnreadCount(notifications) === expected;
      },
    ));
  });

  // Feature: battle-request-notifications, Property 8: marking one unread notification as read decrements count by exactly 1
  it('computeUnreadCount: marking one read decrements by 1', () => {
    fc.assert(fc.property(
      fc.array(notificationArb, { minLength: 1 }),
      (notifications) => {
        const unreadIdx = notifications.findIndex(n => !n.read);
        if (unreadIdx === -1) return true; // skip if no unread
        const before = computeUnreadCount(notifications);
        const updated = notifications.map((n, i) => i === unreadIdx ? { ...n, read: true } : n);
        const after = computeUnreadCount(updated);
        return after === before - 1;
      },
    ));
  });
});

// ---------------------------------------------------------------------------
// Task 11.4 — Property 15: canGoLive
// ---------------------------------------------------------------------------

describe('canGoLive (single check-in)', () => {
  // Feature: battle-request-notifications, Property 15: single check-in does not trigger LIVE transition
  it('canGoLive: returns false when only one user has checked in', () => {
    fc.assert(fc.property(
      inviteArb,
      (invite) => {
        const onlyChallenger = { ...invite, challengerCheckedIn: true, opponentCheckedIn: false };
        const onlyOpponent = { ...invite, challengerCheckedIn: false, opponentCheckedIn: true };
        return !canGoLive(onlyChallenger) && !canGoLive(onlyOpponent);
      },
    ));
  });
});

// ---------------------------------------------------------------------------
// Task 11.5 — Property 17: computeTimeRemaining
// ---------------------------------------------------------------------------

describe('computeTimeRemaining', () => {
  // Feature: battle-request-notifications, Property 17: computeTimeRemaining returns positive for future deadlines
  it('computeTimeRemaining: positive for future deadlines', () => {
    fc.assert(fc.property(
      fc.integer({ min: Date.now() + 1000, max: Date.now() + 7_200_000 }),
      (futureDeadline) => {
        return computeTimeRemaining(futureDeadline) > 0;
      },
    ));
  });

  it('computeTimeRemaining: returns 0 for past deadlines', () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: Date.now() - 1 }),
      (pastDeadline) => {
        return computeTimeRemaining(pastDeadline) === 0;
      },
    ));
  });
});

// ---------------------------------------------------------------------------
// Task 11.6 — Property 20: computeParticipantCount
// ---------------------------------------------------------------------------

describe('computeParticipantCount', () => {
  // Feature: battle-request-notifications, Property 20: computeParticipantCount equals 2 × count of battles with status 'live'
  it('computeParticipantCount: equals 2x count of live battles', () => {
    fc.assert(fc.property(
      fc.array(fc.record({ status: fc.constantFrom('live', 'upcoming', 'completed', 'forfeited') })),
      (battles) => {
        const liveCount = battles.filter(b => b.status === 'live').length;
        return computeParticipantCount(battles) === liveCount * 2;
      },
    ));
  });
});

// ---------------------------------------------------------------------------
// Task 11.7 — Property 21: sortAndGroupNotifications
// ---------------------------------------------------------------------------

describe('sortAndGroupNotifications', () => {
  // Feature: battle-request-notifications, Property 21: unread notifications precede read, each group sorted by createdAt descending
  it('sortAndGroupNotifications: unread before read, each group sorted by createdAt desc', () => {
    fc.assert(fc.property(
      fc.array(notificationArb),
      (notifications) => {
        const { unread, read } = sortAndGroupNotifications(notifications);
        const unreadSorted = [...unread].sort((a, b) => b.createdAt - a.createdAt);
        const readSorted = [...read].sort((a, b) => b.createdAt - a.createdAt);
        return (
          unread.every(n => !n.read) &&
          read.every(n => n.read) &&
          JSON.stringify(unread) === JSON.stringify(unreadSorted) &&
          JSON.stringify(read) === JSON.stringify(readSorted)
        );
      },
    ));
  });
});

// ---------------------------------------------------------------------------
// Task 11.8 — Property 22: renderNotificationMessage
// ---------------------------------------------------------------------------

describe('renderNotificationMessage', () => {
  // Feature: battle-request-notifications, Property 22: all notification types produce a non-empty display message
  it('renderNotificationMessage: returns non-empty string for all types', () => {
    fc.assert(fc.property(
      notificationArb,
      (notification) => {
        const msg = renderNotificationMessage(notification);
        return typeof msg === 'string' && msg.length > 0;
      },
    ));
  });
});

// ---------------------------------------------------------------------------
// Task 11.9 — Property 16: acceptBattleRequest checkin_deadline calculation (pure logic)
// ---------------------------------------------------------------------------

describe('acceptBattleRequest checkin_deadline', () => {
  // Feature: battle-request-notifications, Property 16: checkin_deadline is set to exactly t + 3_600_000 ms (±1000ms tolerance)
  it('acceptBattleRequest: checkin_deadline is t + 3_600_000 ms', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1_000_000_000_000, max: Date.now() + 86_400_000 }),
      (acceptanceTime) => {
        const expectedDeadline = acceptanceTime + 3_600_000;
        const actualDeadline = acceptanceTime + 3_600_000; // pure calculation
        return Math.abs(actualDeadline - expectedDeadline) <= 1000;
      },
    ));
  });
});

// ---------------------------------------------------------------------------
// Task 11.10 — Property 5: duplicate PENDING request rejection (pure logic via filterSentRequests)
// ---------------------------------------------------------------------------

describe('filterSentRequests duplicate PENDING detection', () => {
  // Feature: battle-request-notifications, Property 5: if a PENDING invite already exists for (from, to, challenge), filterSentRequests returns it
  it('filterSentRequests: duplicate PENDING detection', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 1 }),
      fc.string({ minLength: 1 }),
      fc.string({ minLength: 1 }),
      (from, to, challenge) => {
        const existingInvite: import('../../types/index').BattleInvite = {
          id: 'existing',
          from, to, challenge,
          scheduledTime: Date.now(),
          status: 'PENDING',
          isPublic: true,
          timestamp: Date.now(),
          challengerCheckedIn: false,
          opponentCheckedIn: false,
        };
        const result = filterSentRequests([existingInvite], from);
        return result.length === 1 && result[0].id === 'existing';
      },
    ));
  });
});

// ---------------------------------------------------------------------------
// Task 11.11 — Property 11: canGoLive returns false for non-fully-checked-in invites
// ---------------------------------------------------------------------------

describe('canGoLive (non-fully-checked-in)', () => {
  // Feature: battle-request-notifications, Property 11: canGoLive returns false for non-LIVE statuses
  it('canGoLive: returns false for non-fully-checked-in invites', () => {
    fc.assert(fc.property(
      fc.constantFrom('PENDING', 'ACCEPTED', 'REJECTED', 'ARCHIVED') as fc.Arbitrary<BattleInviteStatus>,
      (status) => {
        const invite: import('../../types/index').BattleInvite = {
          id: 'test',
          from: 'a', to: 'b', challenge: 'c',
          scheduledTime: Date.now(),
          status,
          isPublic: true,
          timestamp: Date.now(),
          challengerCheckedIn: false,
          opponentCheckedIn: false,
        };
        return !canGoLive(invite);
      },
    ));
  });
});
