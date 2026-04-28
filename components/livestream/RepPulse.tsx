'use client';
import React from 'react';
import { RepPulseEvent } from '@/types';

interface RepPulseProps {
  pulses: RepPulseEvent[];
  side: 'p1' | 'p2';
}

export default function RepPulse({ pulses, side }: RepPulseProps) {
  const sidePulses = pulses.filter(p => p.player === side);
  if (sidePulses.length === 0) return null;

  return (
    <div className="relative w-full h-full pointer-events-none">
      {sidePulses.map((pulse, i) => {
        const size = Math.min(80, 40 + pulse.count * 8);
        const color = side === 'p1' ? 'bg-blue-400' : 'bg-red-400';
        const offset = i * 8;
        return (
          <div
            key={pulse.id}
            className={`absolute rounded-full ${color} opacity-70 animate-rep-pulse`}
            style={{
              width: size,
              height: size,
              top: `calc(50% - ${size / 2}px + ${offset}px)`,
              left: `calc(50% - ${size / 2}px + ${offset}px)`,
            }}
          />
        );
      })}
    </div>
  );
}
