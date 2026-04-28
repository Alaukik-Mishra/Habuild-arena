import { UserProfile } from '@/types';

export type BattleOutcome = 'win' | 'loss' | 'forfeit';

export interface StatsUpdate {
  wins: number;
  losses: number;
  streak: number;
}

export function updateStats(user: UserProfile, outcome: BattleOutcome): StatsUpdate {
  if (outcome === 'win') {
    return {
      wins: user.wins + 1,
      losses: user.losses,
      streak: user.streak + 1,
    };
  }
  // loss or forfeit
  return {
    wins: user.wins,
    losses: user.losses + 1,
    streak: 0,
  };
}
