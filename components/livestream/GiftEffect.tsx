'use client';
import React, { useEffect } from 'react';
import { GiftEffect as GiftEffectType } from '@/types';

const GIFT_EMOJIS: Record<string, string> = {
  confetti: '🎊',
  fire: '🔥',
  lightning: '⚡',
  crown: '👑',
};

interface GiftEffectProps {
  effect: GiftEffectType | null;
  onComplete: () => void;
}

export default function GiftEffect({ effect, onComplete }: GiftEffectProps) {
  useEffect(() => {
    if (!effect) return;
    const t = setTimeout(onComplete, 2500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effect?.id]);

  if (!effect) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center pointer-events-none animate-gift-overlay">
      <div className="bg-black/60 rounded-3xl px-10 py-8 flex flex-col items-center space-y-3">
        <span className="text-7xl">{GIFT_EMOJIS[effect.giftType] || '🎁'}</span>
        <span className="text-white font-black text-2xl uppercase tracking-widest">
          {effect.giftType.toUpperCase()}
        </span>
        <span className="text-white/80 text-sm font-bold">
          from {effect.senderName}
        </span>
      </div>
    </div>
  );
}
