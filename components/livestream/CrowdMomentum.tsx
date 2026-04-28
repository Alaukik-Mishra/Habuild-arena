'use client';
import React from 'react';

interface CrowdMomentumProps {
  p1Name: string;
  p2Name: string;
  momentumScore: number;
}

export default function CrowdMomentum({ p1Name, p2Name, momentumScore }: CrowdMomentumProps) {
  const p1Width = momentumScore;
  const p2Width = 100 - momentumScore;
  const p1Dominant = momentumScore > 65;
  const p2Dominant = momentumScore < 35;

  return (
    <div className="w-full">
      <div className="text-center mb-2">
        {p1Dominant && (
          <span className="text-xs font-black text-blue-700 uppercase tracking-widest animate-pulse">
            CROWD WITH {p1Name.toUpperCase()}
          </span>
        )}
        {p2Dominant && (
          <span className="text-xs font-black text-red-600 uppercase tracking-widest animate-pulse">
            CROWD WITH {p2Name.toUpperCase()}
          </span>
        )}
        {!p1Dominant && !p2Dominant && (
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Momentum
          </span>
        )}
      </div>
      <div className="flex h-3 rounded-full overflow-hidden border-2 border-gray-200">
        <div
          className={`bg-blue-500 transition-all duration-300 ${p1Dominant ? 'animate-pulse' : ''}`}
          style={{ width: `${p1Width}%` }}
        />
        <div
          className={`bg-red-500 transition-all duration-300 ${p2Dominant ? 'animate-pulse' : ''}`}
          style={{ width: `${p2Width}%` }}
        />
      </div>
    </div>
  );
}
