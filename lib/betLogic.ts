export const BET_AMOUNT = 50;
export const BET_REWARD = 90;

/**
 * Validates a bet amount/balance pair. Returns a stable, narrow error code
 * so the UI can render a precise message (and so we never send an undefined
 * or NaN value into Supabase). Used by `confirmBet` and any future bet flows.
 */
export type BetValidationError =
  | 'INVALID_AMOUNT'       // amount is not a positive finite integer
  | 'INVALID_BALANCE'      // balance is not a finite number ≥ 0
  | 'INSUFFICIENT_BALANCE'; // amount > balance

export function validateBet(
  points: number,
  amount: number = BET_AMOUNT,
): { ok: true } | { ok: false; error: BetValidationError } {
  if (
    typeof amount !== 'number' ||
    !Number.isFinite(amount) ||
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    return { ok: false, error: 'INVALID_AMOUNT' };
  }
  if (typeof points !== 'number' || !Number.isFinite(points) || points < 0) {
    return { ok: false, error: 'INVALID_BALANCE' };
  }
  if (points < amount) {
    return { ok: false, error: 'INSUFFICIENT_BALANCE' };
  }
  return { ok: true };
}

/** Deduct bet amount from points. Returns new balance. */
export function applyBet(points: number, amount: number = BET_AMOUNT): number {
  const v = validateBet(points, amount);
  if (!v.ok) return points;
  return points - amount;
}

/** Resolve a bet. If won, add reward. If lost, no change (already deducted). */
export function resolveBet(points: number, won: boolean, reward: number = BET_REWARD): number {
  if (typeof reward !== 'number' || !Number.isFinite(reward) || reward < 0) return points;
  return won ? points + reward : points;
}

/** Check if user can place a bet */
export function canBet(points: number, amount: number = BET_AMOUNT): boolean {
  return validateBet(points, amount).ok;
}
