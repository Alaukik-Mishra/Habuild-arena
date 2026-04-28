import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { getReferralStats } from '../lib/db';
import { Gift, Copy, Check, Users, Coins } from 'lucide-react';

interface Props {
  user: UserProfile;
  setPoints: React.Dispatch<React.SetStateAction<number>>;
}

export default function ReferralPage({ user, setPoints }: Props) {
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ count: 0, pointsEarned: 0 });

  const referralLink = `${typeof window !== 'undefined' ? window.location.origin : 'https://arena.app'}?ref=${encodeURIComponent(user.name)}`;

  useEffect(() => {
    getReferralStats(user.name)
      .then(s => setStats(s))
      .catch(() => {});
  }, [user.name]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex-1 overflow-y-auto px-5 pt-8 pb-28 scrollbar-hide">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-serif font-bold text-gray-900">Referrals</h2>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Invite friends, earn coins</p>
      </div>

      {/* Hero card */}
      <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-3xl p-6 text-white mb-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full" />
        <div className="relative z-10">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
            <Gift className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-2xl font-serif font-bold mb-1">Earn 20 Coins</h3>
          <p className="text-white/80 text-sm">for every friend who joins Arena using your link</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-[0_4px_0_#e5e7eb] flex flex-col items-center">
          <Users className="w-6 h-6 text-blue-700 mb-2" />
          <span className="text-2xl font-bold text-gray-900">{stats.count}</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Friends Invited</span>
        </div>
        <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-[0_4px_0_#e5e7eb] flex flex-col items-center">
          <Coins className="w-6 h-6 text-yellow-500 mb-2" />
          <span className="text-2xl font-bold text-gray-900">{stats.pointsEarned}</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Coins Earned</span>
        </div>
      </div>

      {/* Referral link */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-[0_4px_0_#e5e7eb] mb-6">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Your Referral Link</p>
        <div className="flex items-center space-x-2">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 overflow-hidden">
            <p className="text-xs text-gray-600 font-mono truncate">{referralLink}</p>
          </div>
          <button
            onClick={handleCopy}
            className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all ${copied ? 'bg-green-50 border-green-200 text-green-600' : 'bg-blue-50 border-blue-200 text-blue-700 active:bg-blue-100'}`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="w-full py-4 bg-green-600 text-white font-bold uppercase tracking-widest rounded-2xl shadow-[0_5px_0_#14532d] active:shadow-none active:translate-y-[5px] transition-all flex items-center justify-center space-x-2"
      >
        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
        <span>{copied ? 'Copied!' : 'Copy Invite Link'}</span>
      </button>

      {/* How it works */}
      <div className="mt-8">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">How it works</h3>
        <div className="space-y-3">
          {[
            { step: '1', text: 'Share your unique referral link with friends' },
            { step: '2', text: 'Friend signs up using your link' },
            { step: '3', text: 'You earn 20 coins instantly!' },
          ].map(item => (
            <div key={item.step} className="flex items-center space-x-3 bg-white border-2 border-gray-100 rounded-xl p-3 shadow-sm">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-black text-sm flex-shrink-0">{item.step}</div>
              <p className="text-sm text-gray-600 font-medium">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
