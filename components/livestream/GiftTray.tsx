'use client';
import React, { useState } from 'react';
import { GiftType } from '@/types';
import { GIFT_COSTS } from '@/lib/giftLogic';

const GIFTS: { type: GiftType; emoji: string; label: string }[] = [
  { type: 'confetti', emoji: '🎊', label: 'Confetti' },
  { type: 'fire', emoji: '🔥', label: 'Fire' },
  { type: 'lightning', emoji: '⚡', label: 'Lightning' },
  { type: 'crown', emoji: '👑', label: 'Crown' },
];

interface GiftTrayProps {
  onSendGift: (giftType: GiftType) => void;
  userPoints: number;
  isLive: boolean;
}

export default function GiftTray({ onSendGift, userPoints, isLive }: GiftTrayProps) {
  const [insufficientGift, setInsufficientGift] = useState<string | null>(null);

  if (!isLive) return null;

  const handleTap = (gift: typeof GIFTS[0]) => {
    const cost = GIFT_COSTS[gift.type];
    if (userPoints < cost) {
      setInsufficientGift(gift.type);
      setTimeout(() => setInsufficientGift(null), 1500);
      return;
    }
    onSendGift(gift.type);
  };

  return (
    <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-sm">
      <h3 className="font-serif italic font-bold text-gray-900 text-sm mb-3 text-center">
        Send a Gift 🎁
      </h3>
      <div className="flex justify-center space-x-2">
        {GIFTS.map(gift => {
          const cost = GIFT_COSTS[gift.type];
          const canAfford = userPoints >= cost;
          return (
            <button
              key={gift.type}
              onClick={() => handleTap(gift)}
              className={`flex flex-col items-center px-3 py-2 bg-white border-2 border-gray-100 rounded-xl transition-all ${
                canAfford
                  ? 'shadow-[0_3px_0_#d1d5db] active:shadow-none active:translate-y-[3px]'
                  : 'opacity-40 cursor-not-allowed'
              }`}
            >
              <span className="text-2xl">{gift.emoji}</span>
              <span className="text-[9px] font-bold text-gray-500 mt-0.5">{cost}🪙</span>
            </button>
          );
        })}
      </div>
      {insufficientGift && (
        <p className="text-center text-[10px] font-bold text-red-500 mt-2">
          Not enough coins
        </p>
      )}
    </div>
  );
}
