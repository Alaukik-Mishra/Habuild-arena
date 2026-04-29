import type { BattleInvite, AppNotification } from '../types/index';

/**
 * Returns invites where from === currentUser AND status === 'PENDING'.
 */
export function filterSentRequests(invites: BattleInvite[], currentUser: string): BattleInvite[] {
  return invites.filter(i => i.from === currentUser && i.status === 'PENDING');
}

/**
 * Returns count of notifications where read === false.
 */
export function computeUnreadCount(notifications: AppNotification[]): number {
  return notifications.filter(n => !n.read).length;
}

/**
 * Returns milliseconds remaining until checkinDeadline, clamped to 0.
 */
export function computeTimeRemaining(checkinDeadline: number): number {
  return Math.max(0, checkinDeadline - Date.now());
}

/**
 * Splits notifications into unread/read groups, each sorted by createdAt descending.
 */
export function sortAndGroupNotifications(
  notifications: AppNotification[]
): { unread: AppNotification[]; read: AppNotification[] } {
  const byRecencyDesc = (a: AppNotification, b: AppNotification) => b.createdAt - a.createdAt;
  return {
    unread: notifications.filter(n => !n.read).sort(byRecencyDesc),
    read: notifications.filter(n => n.read).sort(byRecencyDesc),
  };
}

/**
 * Returns a human-readable message for a notification.
 */
export function renderNotificationMessage(notification: AppNotification): string {
  const { type, payload } = notification;
  switch (type) {
    case 'battle_request':
      return `${payload.challengerName} challenged you to ${payload.challengeName}`;
    case 'battle_accepted':
      return `${payload.opponentName} accepted your challenge: ${payload.challengeName}`;
    case 'battle_declined':
      return `${payload.opponentName} declined your challenge: ${payload.challengeName}`;
    case 'join_reminder':
      return `Challenge accepted! Join ${payload.challengeName} within 1 hour`;
    case 'default_win': {
      // Challenger variant: challenger did not arrive
      if (payload.challengerName && !payload.opponentName) {
        return 'You won by default — opponent did not arrive in time';
      }
      return 'You won by default — opponent did not arrive in time';
    }
    default:
      return 'New notification';
  }
}

/**
 * Returns true only when both participants have checked in.
 */
export function canGoLive(invite: BattleInvite): boolean {
  return invite.challengerCheckedIn && invite.opponentCheckedIn;
}

/**
 * Returns the number of active participants (2 per live battle).
 */
export function computeParticipantCount(battles: { status: string }[]): number {
  return battles.filter(b => b.status === 'live').length * 2;
}
