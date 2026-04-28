export const BET_AMOUNT = 50;
export const BET_REWARD = 90;

/** Deduct bet amount from points. Returns new balance. */
export function applyBet(points: number, amount: number = BET_AMOUNT): number {
  if (points < amount) return points;
  return points - amount;
}

/** Resolve a bet. If won, add reward. If lost, no change (already deducted). */
export function resolveBet(points: number, won: boolean, reward: number = BET_REWARD): number {
  return won ? points + reward : points;
}

/** Check if user can place a bet */
export function canBet(points: number, amount: number = BET_AMOUNT): boolean {
  return points >= amount;
}
