import { Home, Swords, Trophy, MessageSquare, User } from 'lucide-react';
import { AppScreen } from '../types';

interface Props {
  current: AppScreen;
  onNavigate: (s: AppScreen) => void;
  unreadNotificationCount?: number;
  onNotificationsClick?: () => void;
}

export default function BottomNav({ current, onNavigate, unreadNotificationCount, onNotificationsClick }: Props) {
  const items = [
    { screen: 'dashboard' as AppScreen, icon: Home, label: 'HOME' },
    { screen: 'arena' as AppScreen, icon: Swords, label: 'ARENA' },
    { screen: 'leaderboard' as AppScreen, icon: Trophy, label: 'RANK' },
    { screen: 'community' as AppScreen, icon: MessageSquare, label: 'COMMUNITY' },
    { screen: 'profile' as AppScreen, icon: User, label: 'ME' },
  ];

  return (
    <div className="shrink-0 sticky bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-100 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex justify-between items-center z-20">
      {items.map(({ screen, icon: Icon, label }) => (
        <button
          key={screen}
          onClick={() => screen === 'dashboard' && unreadNotificationCount && onNotificationsClick ? onNotificationsClick() : onNavigate(screen)}
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
            {screen === 'dashboard' && unreadNotificationCount && unreadNotificationCount > 0 ? (
              <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-[9px] font-bold text-white bg-red-500 rounded-full z-20">
                {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
              </span>
            ) : null}
          </div>
          <span className="text-[10px] font-bold tracking-wider">{label}</span>
        </button>
      ))}
    </div>
  );
}
