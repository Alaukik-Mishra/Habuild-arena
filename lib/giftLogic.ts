import { GiftType } from '@/types';

export type { GiftType };

export const GIFT_COSTS: Record<GiftType, number> = {
  confetti: 10,
  fire: 15,
  lightning: 25,
  crown: 50,
};
