import React, { useState } from 'react';
import { Trophy, Flame, Crown, Medal, Star } from 'lucide-react';
import { LeaderboardEntry } from '../types';

interface Props {
  userName: string;
}

const MOCK_DATA: LeaderboardEntry[] = [
  { rank: 1, name: 'Leo', wins: 120, streak: 12, earnings: 24500, stars: 450 },
  { rank: 2, name: 'Alex', wins: 98, streak: 5, earnings: 18200, stars: 320 },
  { rank: 3, name: 'Jordan', wins: 85, streak: 3, earnings: 15600, stars: 280 },
  { rank: 4, name: 'Sam', wins: 88, streak: 4, earnings: 14100, stars: 265 },
  { rank: 5, name: 'Priya', wins: 72, streak: 8, earnings: 12300, stars: 210 },
  { rank: 6, name: 'Kunal', wins: 65, streak: 2, earnings: 9800, stars: 175 },
  { rank: 7, name: 'Arjun', wins: 58, streak: 6, earnings: 8500, stars: 150 },
  { rank: 8, name: 'Rahul', wins: 45, streak: 1, earnings: 6200, stars: 120 },
];

const RANK_ICONS = [
  <Crown className="w-5 h-5 text-yellow-500" key="1" />,
  <Medal className="w-5 h-5 text-gray-400" key="2" />,
  <Medal className="w-5 h-5 text-amber-600" key="3" />,
];

export default function Leaderboard({ userName }: Props) {
  const [sortBy, setSortBy] = useState<'stars' | 'points'>('stars');

  const entries = MOCK_DATA.map(entry =>
    entry.name === userName ? { ...entry, isUser: true as const } : { ...entry, isUser: false as const }
  );

  const userInList = entries.some(e => e.isUser);
  let displayEntries = entries;

  if (!userInList) {
    displayEntries = [
      ...entries,
      { rank: 99, name: userName, wins: 0, streak: 0, earnings: 0, stars: 0, isUser: true as const },
    ];
  }

  const sorted = [...displayEntries].sort((a, b) =>
    sortBy === 'stars' ? b.stars - a.stars : b.earnings - a.earnings
  );

  return (
    <div className="flex-1 overflow-y-auto px-5 pt-8 pb-28 scrollbar-hide">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-serif font-bold text-gray-900">Leaderboard</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Top Arena Warriors</p>
        </div>
        <div className="bg-yellow-50 border-2 border-yellow-200 text-yellow-700 p-2 rounded-xl">
          <Trophy className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-gray-100 p-1 rounded-xl flex mb-6 shadow-inner">
        <button onClick={() => setSortBy('stars')} className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center space-x-1.5 ${sortBy === 'stars' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
          <Star className="w-3.5 h-3.5" /><span>Stars</span>
        </button>
        <button onClick={() => setSortBy('points')} className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center space-x-1.5 ${sortBy === 'points' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
          <Trophy className="w-3.5 h-3.5" /><span>Points</span>
        </button>
      </div>

      <div className="space-y-3">
        {sorted.map((entry, idx) => (
          <div
            key={entry.name}
            className={`flex items-center p-4 rounded-2xl border-2 transition-all ${
              entry.isUser
                ? 'bg-primary/5 border-primary/20 shadow-sm'
                : 'bg-white border-gray-100'
            }`}
          >
            <div className="w-10 h-10 flex items-center justify-center mr-4">
              {idx < 3 ? (
                RANK_ICONS[idx]
              ) : (
                <span className="text-sm font-bold text-gray-400">#{idx + 1}</span>
              )}
            </div>

            <img
              src={`https://ui-avatars.com/api/?name=${entry.name}&background=${entry.isUser ? '1D4ED8' : 'E5E7EB'}&color=${entry.isUser ? 'fff' : '374151'}&size=64`}
              alt=""
              className="w-10 h-10 rounded-full mr-4 border-2 border-white shadow-sm"
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className={`font-bold text-sm truncate ${entry.isUser ? 'text-primary' : 'text-gray-900'}`}>
                  {entry.name} {entry.isUser && '(You)'}
                </span>
              </div>
              <div className="flex items-center space-x-3 mt-0.5">
                <span className="text-[10px] font-bold text-gray-400">{entry.wins}W</span>
                <span className="flex items-center text-[10px] font-bold text-orange-500">
                  <Flame className="w-3 h-3 mr-0.5" />
                  {entry.streak}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-sm font-bold text-gray-900">
                {sortBy === 'stars' ? entry.stars.toLocaleString() : entry.earnings.toLocaleString()}
              </span>
              <span className="text-[10px] text-gray-400 font-bold ml-1">{sortBy === 'stars' ? '⭐' : '🪙'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
