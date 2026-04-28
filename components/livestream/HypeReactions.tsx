'use client';
import React from 'react';
import { FloatingReaction } from '@/types';

const EMOJIS = ['🔥', '👑', '😂', '😡', '😭'];

interface HypeReactionsProps {
  reactions: FloatingReaction[];
  onReact: (emoji: string) => void;
}

export default function HypeReactions({ reactions, onReact }: HypeReactionsProps) {
  return (
    <div className="relative">
      {/* Floating reactions overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ height: 140 }}>
        {reactions.map(r => (
          <span
            key={r.id}
            className="absolute text-2xl animate-float-up"
            style={{ left: `${r.x}%`, bottom: 0 }}
          >
            {r.emoji}
          </span>
        ))}
      </div>

      {/* Emoji tray */}
      <div className="flex justify-center space-x-2 pt-2 pb-1">
        {EMOJIS.map(emoji => (
          <button
            key={emoji}
            onClick={() => onReact(emoji)}
            className="w-11 h-11 bg-white border-2 border-gray-100 rounded-xl text-xl flex items-center justify-center shadow-[0_3px_0_#d1d5db] active:shadow-none active:translate-y-[3px] transition-all"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
