import { LiveBattle } from '@/types';

export type BattleFilter = 'all' | 'live' | 'upcoming' | 'completed';

export function filterBattles(
  battles: LiveBattle[],
  filter: BattleFilter,
  searchQuery: string,
  now: number
): LiveBattle[] {
  return battles.filter(battle => {
    // Only show public battles in the feed
    if (!battle.isPublic) return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matches =
        battle.challenge.toLowerCase().includes(q) ||
        battle.p1.name.toLowerCase().includes(q) ||
        battle.p2.name.toLowerCase().includes(q);
      if (!matches) return false;
    }

    // Status filter
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
