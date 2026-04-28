import React from 'react';
import { UserProfile, BetRecord } from '../types';
import { Flame, Trophy, Crosshair, LogOut, Clock } from 'lucide-react';

interface Props {
  user: UserProfile;
  betHistory: BetRecord[];
  points: number;
  onLogout: () => void;
}

export default function Profile({ user, betHistory, points, onLogout }: Props) {
  return (
    <div className="flex-1 overflow-y-auto px-5 pt-8 pb-28 scrollbar-hide">
      <div className="flex flex-col items-center mb-8 mt-4">
          <div className="relative mb-4">
            <img src={`https://ui-avatars.com/api/?name=${user.name}&background=1D4ED8&color=fff&size=128`} className="w-24 h-24 rounded-full border-4 border-white shadow-xl" alt="avatar" />
            <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-lg border-2 border-white shadow-sm flex items-center">
              <Flame className="w-3 h-3 mr-0.5 fill-current" /> {user.streak}
            </div>
          </div>
          <h2 className="text-2xl font-serif font-bold text-gray-900">{user.name}</h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{user.countryCode} {user.phone}</p>
      </div>


      <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-[0_4px_0_#e5e7eb] flex flex-col items-center">
            <Trophy className="w-6 h-6 text-yellow-500 mb-2" />
            <span className="text-2xl font-bold text-gray-900">{user.wins}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Wins</span>
          </div>
          <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-[0_4px_0_#e5e7eb] flex flex-col items-center">
            <Crosshair className="w-6 h-6 text-red-500 mb-2" />
            <span className="text-2xl font-bold text-gray-900">{user.losses}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Losses</span>
          </div>
      </div>

                  <div className="bg-yellow-100 border-2 border-yellow-400 text-yellow-700 px-3 py-1.5 rounded-xl font-bold flex items-center justify-center shadow-[0_3px_0_#facc15] mb-4">
        Points: {points}
      </div>


      {/* Betting History */}
      <div className="mb-8">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Betting History</h3>
        {betHistory.length === 0 ? (
          <div className="bg-gray-50 border-2 border-gray-100 rounded-2xl p-6 text-center">
            <p className="text-xs text-gray-400 font-medium">No bets placed yet.</p>
            <p className="text-[10px] text-gray-300 mt-1">Place a bet on a live battle to see it here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {betHistory.map(bet => (
              <div key={bet.id} className={`bg-white border-2 rounded-2xl p-4 shadow-sm ${bet.status === 'won' ? 'border-green-100' : 'border-red-100'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-xs font-bold text-gray-900">{bet.battleName}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{bet.challenge}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bet.status === 'won' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {bet.status === 'won' ? 'WON' : 'LOST'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">Bet on:</span>
                    <span className="font-bold text-primary">{bet.playerBetOn}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">Winner:</span>
                    <span className={`font-bold ${bet.winner === bet.playerBetOn ? 'text-green-600' : 'text-red-500'}`}>{bet.winner}</span>
                  </div>
                </div>
                <div className="flex items-center text-[10px] text-gray-400 mt-2">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date(bet.timestamp).toLocaleDateString()} • {bet.amount} 
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ongoing Journey</h3>
          <div className="bg-primary/5 border-2 border-primary/10 rounded-2xl p-5">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-primary text-sm">Iron Will Milestone</span>
              <span className="text-xs font-bold text-primary">60%</span>
            </div>
            <div className="w-full h-2 bg-primary/10 rounded-full overflow-hidden flex">
              <div className="h-full bg-primary rounded-full transition-all w-[60%]" />
            </div>
            <p className="text-[10px] text-gray-500 font-medium mt-3">Win 6 more battles to unlock Elite Avatar frame.</p>
          </div>
      </div>


      <button onClick={onLogout} className="mt-4 flex items-center justify-center space-x-2 text-gray-400 hover:text-red-500 transition-colors w-full py-4 font-bold text-xs uppercase tracking-widest">
         <LogOut className="w-4 h-4" />
         <span>Logout Session</span>
      </button>
    </div>
  );
}