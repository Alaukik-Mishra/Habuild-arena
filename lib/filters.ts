import { LiveBattle } from '@/types';

export type BattleFilter = 'all' | 'live' | 'upcoming' | 'completed';

export function filterBattles(
  battles: LiveBattle[],
  filter: BattleFilter,
  searchQuery: string,
  now: number,
  userName?: string
): LiveBattle[] {
  return battles.filter(battle => {
    // Pending offers should not appear in public battle discovery.
    if (battle.status === 'pending') return false;

    // Hide private battles unless the user is a participant
    if (!battle.isPublic) {
      if (!userName) return false;
      if (battle.p1.name !== userName && battle.p2.name !== userName) return false;
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matches =
        battle.challenge.toLowerCase().includes(q) ||
        battle.p1.name.toLowerCase().includes(q) ||
        battle.p2.name.toLowerCase().includes(q);
      if (!matches) return false;
    }

    return matchesFilter(battle, filter, now);
  });
}

export function matchesFilter(
  battle: LiveBattle,
  filter: BattleFilter,
  now: number
): boolean {
  if (filter === 'all') return true;

  const isCompleted = !!battle.winner || battle.status === 'completed' || battle.status === 'forfeited';
  const isLive =
    !isCompleted &&
    (battle.status === 'live' ||
      battle.status === 'active' ||
      (battle.scheduledTime !== undefined && battle.scheduledTime <= now));
  const isUpcoming =
    !isCompleted &&
    battle.scheduledTime !== undefined &&
    battle.scheduledTime > now;

  if (filter === 'live') return isLive;
  if (filter === 'upcoming') return isUpcoming;
  if (filter === 'completed') return isCompleted;
  return true;
}
