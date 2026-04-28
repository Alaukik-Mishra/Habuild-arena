import React from 'react';
import { Home, Swords, Trophy, User, Gift } from 'lucide-react';
import { AppScreen } from '../types';

interface Props {
  current: AppScreen;
  onNavigate: (s: AppScreen) => void;
}

export default function BottomNav({ current, onNavigate }: Props) {
  const items = [
    { screen: 'dashboard' as AppScreen, icon: Home, label: 'HOME' },
    { screen: 'arena' as AppScreen, icon: Swords, label: 'ARENA' },
    { screen: 'leaderboard' as AppScreen, icon: Trophy, label: 'RANK' },
    { screen: 'referral' as AppScreen, icon: Gift, label: 'REFER' },
    { screen: 'profile' as AppScreen, icon: User, label: 'ME' },
  ];

  return (
    <div className="absolute bottom-0 w-full min-h-[5rem] bg-white/90 backdrop-blur-md border-t border-gray-100 px-4 py-3 flex justify-between items-start pt-4 rounded-b-[2.5rem] pb-[max(1rem,env(safe-area-inset-bottom))] z-20">
      {items.map(({ screen, icon: Icon, label }) => (
        <button
          key={screen}
          onClick={() => onNavigate(screen)}
          className={`flex flex-col items-center transition-colors group ${current === screen ? 'text-blue-700' : 'text-gray-400 hover:text-gray-800'}`}
        >
          <div className="relative">
            {current === screen && screen === 'arena' && (
              <div className="absolute inset-0 bg-blue-700/20 blur-md rounded-full" />
            )}
            <Icon
              className={`w-6 h-6 mb-1 transition-transform relative z-10 ${current === screen ? 'scale-110' : 'group-hover:-translate-y-1'}`}
              strokeWidth={current === screen ? 2.5 : 2}
            />
          </div>
          <span className="text-[10px] font-bold tracking-wider">{label}</span>
        </button>
      ))}
    </div>
  );
}
