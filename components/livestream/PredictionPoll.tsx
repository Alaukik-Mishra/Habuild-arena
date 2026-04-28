'use client';
import React from 'react';

interface PredictionPollProps {
  p1Name: string;
  p2Name: string;
  votes: Record<string, number>;
  myVote: string | null;
  onVote: (playerName: string) => void;
}

export default function PredictionPoll({ p1Name, p2Name, votes, myVote, onVote }: PredictionPollProps) {
  const p1Votes = votes[p1Name] || 0;
  const p2Votes = votes[p2Name] || 0;
  const total = p1Votes + p2Votes;
  const p1Pct = total > 0 ? Math.round((p1Votes / total) * 100) : 50;
  const p2Pct = total > 0 ? Math.round((p2Votes / total) * 100) : 50;

  return (
    <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-sm">
      <h3 className="font-serif italic font-bold text-gray-900 text-sm mb-3 text-center">
        Who Will Win? 🏆
      </h3>

      {[{ name: p1Name, pct: p1Pct, color: 'bg-blue-500', border: 'border-blue-500' },
        { name: p2Name, pct: p2Pct, color: 'bg-red-500', border: 'border-red-500' }].map(player => (
        <button
          key={player.name}
          onClick={() => !myVote && onVote(player.name)}
          disabled={!!myVote}
          className={`w-full mb-2 rounded-xl overflow-hidden border-2 transition-all ${
            myVote === player.name ? player.border : 'border-gray-100'
          } ${!myVote ? 'active:scale-[0.98]' : ''}`}
        >
          <div className="relative bg-gray-50 px-4 py-3 flex items-center justify-between">
            <div
              className={`absolute left-0 top-0 h-full ${player.color} opacity-20 transition-all duration-500`}
              style={{ width: `${player.pct}%` }}
            />
            <span className="relative font-bold text-sm text-gray-900">{player.name}</span>
            <span className="relative text-xs font-bold text-gray-500">{player.pct}%</span>
          </div>
        </button>
      ))}

      <p className="text-[10px] text-gray-400 text-center mt-1">
        {total > 0 ? `${total} vote${total !== 1 ? 's' : ''}` : 'Be the first to vote!'}
      </p>
    </div>
  );
}
