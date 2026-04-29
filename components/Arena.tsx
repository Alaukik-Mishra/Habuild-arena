import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Send, Search, Globe, Lock, ArrowLeft, UserPlus, Clock, ChevronDown, Coins, Zap, MessageCircle, Link as LinkIcon, Crosshair, Flame, Trophy, RotateCcw } from 'lucide-react';
import { AppScreen, Invite, FriendRequest, ChatThread, UserProfile, LiveBattle, PlayerStats, BattleInvite, BattleInviteStatus } from '../types';
import { subscribeToChat, acceptBattleRequest, rejectBattleRequest, createBattleRequest } from '../lib/db';
import { filterBattles, BattleFilter } from '../lib/filters';
import { BET_AMOUNT, validateBet } from '../lib/betLogic';
import SentRequestsTab from './SentRequestsTab';

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

// ─── BattlesSection ──────────────────────────────────────────────────────────

const ALL_EMOJIS = ['fire', 'crown', 'laugh', 'angry', 'sad'];
const EMOJI_MAP: Record<string, string> = { fire: '🔥', crown: '👑', laugh: '😂', angry: '😡', sad: '😭' };

interface BattlesSectionProps {
  user: UserProfile;
  points: number;
  setPoints: React.Dispatch<React.SetStateAction<number>>;
  battles: LiveBattle[];
  setBattles: React.Dispatch<React.SetStateAction<LiveBattle[]>>;
  bets: Record<string, string>;
  setBets: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  now: number;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  battleFilter: BattleFilter;
  setBattleFilter: React.Dispatch<React.SetStateAction<BattleFilter>>;
  activeBattleId: string | null;
  setActiveBattleId: React.Dispatch<React.SetStateAction<string | null>>;
  setActiveBattleConfig: React.Dispatch<React.SetStateAction<{ opponent: string; challenge: string; target: number; scheduledTime: number } | null>>;
  setCurrentScreen: React.Dispatch<React.SetStateAction<AppScreen>>;
  selectedBattleId: string | null;
  setSelectedBattleId: React.Dispatch<React.SetStateAction<string | null>>;
}

export function BattlesSection({
  user, points, setPoints, battles, setBattles, bets, setBets, now,
  searchQuery, setSearchQuery, battleFilter, setBattleFilter,
  activeBattleId, setActiveBattleId, setActiveBattleConfig, setCurrentScreen,
  setSelectedBattleId,
}: BattlesSectionProps) {
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [selectedProfile, setSelectedProfile] = useState<PlayerStats | null>(null);
  const [pendingBet, setPendingBet] = useState<{ battleId: string; player: string } | null>(null);
  const [commentModalBattle, setCommentModalBattle] = useState<string | null>(null);

  const handleEmote = (e: React.MouseEvent, battleId: string, emote: string) => {
    e.stopPropagation();
    setBattles(prev => prev.map(b => {
      if (b.id !== battleId) return b;
      const current = b.reactions[emote] || [];
      const already = current.includes(user.name);
      return {
        ...b,
        reactions: {
          ...b.reactions,
          [emote]: already ? current.filter(n => n !== user.name) : [...current, user.name],
        },
      };
    }));
  };

  const [betError, setBetError] = useState<string | null>(null);
  const confirmBet = () => {
    if (!pendingBet) return;
    const { battleId, player } = pendingBet;
    if (bets[battleId]) { setPendingBet(null); return; }
    // Input sanitisation — reject NaN/0/negative amounts and insufficient balances
    // before mutating state. Previously this used a bare `points >= 50` guard
    // which silently no-op'd on edge cases (NaN points, missing battle, etc.).
    const validation = validateBet(points, BET_AMOUNT);
    if (!validation.ok) {
      setBetError(
        validation.error === 'INSUFFICIENT_BALANCE'
          ? `You need at least ${BET_AMOUNT} coins to place this bet.`
          : 'Could not place this bet — invalid amount or balance.'
      );
      return;
    }
    setBetError(null);
    setPoints(p => p - BET_AMOUNT);
    setBets(prev => ({ ...prev, [battleId]: player }));
    setPendingBet(null);
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(`Join Arena: ${window.location.origin}?ref=${user.name}`);
    alert('Invite link copied!');
  };

  const handleAddComment = (battleId: string) => {
    const text = commentText[battleId];
    if (!text || !text.trim()) return;
    setBattles(prev => prev.map(b => {
      if (b.id !== battleId) return b;
      return { ...b, comments: [...b.comments, { id: Date.now().toString(), user: user.name, text }] };
    }));
    setCommentText(prev => ({ ...prev, [battleId]: '' }));
  };

  const filteredBattles = filterBattles(battles, battleFilter, searchQuery, now, user.name);

  const isParticipant = (battle: LiveBattle) =>
    battle.p1.name === user.name || battle.p2.name === user.name;

  const handleBattleClick = (battle: LiveBattle) => {
    if (isParticipant(battle) && battle.status !== 'completed' && battle.status !== 'forfeited') {
      setActiveBattleId(battle.id);
      setActiveBattleConfig({
        opponent: battle.p1.name === user.name ? battle.p2.name : battle.p1.name,
        challenge: battle.challenge,
        target: battle.target,
        scheduledTime: battle.scheduledTime || now,
      });
      setCurrentScreen('battle');
    } else {
      setSelectedBattleId(battle.id);
      setCurrentScreen('live');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-5 text-white mb-4 shadow-lg relative overflow-hidden flex items-center justify-between">
        <div className="relative z-10 space-y-1 max-w-[65%]">
          <h3 className="font-serif font-bold text-xl">Grow your Tribe</h3>
          <p className="text-white/80 text-xs font-medium">Refer friends, earn 20 coins each!</p>
        </div>
        <button onClick={handleCopyInvite} className="relative z-10 bg-white text-green-700 w-12 h-12 flex items-center justify-center rounded-full font-bold shadow-[0_4px_0_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none transition-all">
          <LinkIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="mb-4 space-y-2">
        <div className="flex items-center bg-white border-2 border-gray-200 rounded-xl px-3 py-2 shadow-[0_3px_0_#e5e7eb]">
          <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search battles or players..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 text-sm font-bold outline-none bg-transparent placeholder:text-gray-300"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-gray-300 hover:text-gray-600 ml-1">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex space-x-2 overflow-x-auto scrollbar-hide pb-1">
          {(['all', 'live', 'upcoming', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setBattleFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border-2 transition-all shadow-[0_3px_0] active:shadow-none active:translate-y-[3px] flex-shrink-0 ${
                battleFilter === f
                  ? 'bg-gray-900 text-white border-gray-900 shadow-gray-700'
                  : 'bg-white text-gray-500 border-gray-200 shadow-gray-100'
              }`}
            >
              {f === 'live' ? '🔴 Live' : f === 'upcoming' ? '⏰ Soon' : f === 'completed' ? '✅ Done' : 'All'}
            </button>
          ))}
        </div>
      </div>

      <h3 className="font-bold text-gray-900 flex items-center">
        <Zap className="w-4 h-4 mr-2 text-yellow-500 fill-yellow-500" />
        LIVE ARENA BETTING
      </h3>

      {filteredBattles.length === 0 && (
        <div className="bg-gray-50 border-2 border-gray-100 rounded-2xl p-8 text-center">
          <p className="text-sm text-gray-400 font-medium">No battles found</p>
          <p className="text-[10px] text-gray-300 mt-1">Try a different filter or search term.</p>
        </div>
      )}

      {filteredBattles.map(battle => {
        const myBet = bets[battle.id];
        const sched = battle.scheduledTime;
        const bettingOpen = sched ? now < sched : battle.bettingOpen;
        const isUpcoming = sched && now < sched;
        const isCompleted = !!battle.winner || battle.status === 'completed' || battle.status === 'forfeited';
        const amParticipant = isParticipant(battle);
        // "Rejoin" must only show for genuinely-active battles (status === 'live'
        // AND not already in this client's active battle session). Previously
        // this also rendered for upcoming / pre-checkin battles, which is what
        // produced the "stuck on Rejoin" loop the user reported.
        const isLive = battle.status === 'live' && !isCompleted;
        const canRejoin = amParticipant && isLive && activeBattleId !== battle.id;

        return (
          <div
            key={battle.id}
            onClick={() => handleBattleClick(battle)}
            className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-[0_5px_0_#e5e7eb] mb-2 flex flex-col relative cursor-pointer active:shadow-[0_2px_0_#e5e7eb] active:translate-y-[3px] transition-all"
          >
            <div className="flex justify-between items-start border-b border-gray-100 pb-3 mb-3">
              <div className="flex flex-col flex-1 mr-2">
                <h4 className="font-serif text-lg font-bold text-blue-700 leading-tight">{battle.challenge}</h4>
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  {isCompleted ? (
                    <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200 text-[10px] font-bold uppercase">Completed</span>
                  ) : isUpcoming ? (
                    <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 flex items-center text-[10px] font-bold uppercase">
                      <Clock className="w-3 h-3 mr-1" />Upcoming
                    </span>
                  ) : (
                    <span className="text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-200 flex items-center text-[10px] font-bold uppercase">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mr-1" />LIVE
                    </span>
                  )}
                  {amParticipant && (
                    <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 text-[10px] font-bold uppercase">You</span>
                  )}
                </div>
                {sched && (
                  <span className="text-[9px] text-gray-400 mt-1">
                    {isUpcoming
                      ? `Starts ${new Date(sched).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                      : `Started ${new Date(sched).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold bg-yellow-50 border border-yellow-200 text-yellow-700 px-2 py-1 rounded-lg flex-shrink-0">
                Pool: {battle.pool} 🪙
              </span>
            </div>

            <div className="flex justify-between items-center mb-4">
              <div onClick={e => { e.stopPropagation(); setSelectedProfile(battle.p1); }} className="flex flex-col items-center flex-1 cursor-pointer">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold mb-1 border-2 border-blue-500 shadow-sm">
                  {battle.p1.name[0]}
                </div>
                <span className="text-[10px] font-bold text-gray-800">{battle.p1.name}</span>
                <div className="text-[8px] text-gray-400 font-bold bg-gray-50 px-1.5 py-0.5 rounded mt-0.5">{battle.p1.wins}W • {battle.p1.streak}🔥</div>
                <div className="w-16 bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, (battle.p1Reps / battle.target) * 100)}%` }} />
                </div>
                <span className="text-[9px] text-gray-400 mt-0.5">{battle.p1Reps}/{battle.target}</span>
              </div>

              <div className="text-xs font-serif italic text-gray-400 font-bold px-2">VS</div>

              <div onClick={e => { e.stopPropagation(); setSelectedProfile(battle.p2); }} className="flex flex-col items-center flex-1 cursor-pointer">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-700 font-bold mb-1 border-2 border-red-500 shadow-sm">
                  {battle.p2.name[0]}
                </div>
                <span className="text-[10px] font-bold text-gray-800">{battle.p2.name}</span>
                <div className="text-[8px] text-gray-400 font-bold bg-gray-50 px-1.5 py-0.5 rounded mt-0.5">{battle.p2.wins}W • {battle.p2.streak}🔥</div>
                <div className="w-16 bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-red-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, (battle.p2Reps / battle.target) * 100)}%` }} />
                </div>
                <span className="text-[9px] text-gray-400 mt-0.5">{battle.p2Reps}/{battle.target}</span>
              </div>
            </div>

            {canRejoin && (
              <button
                onClick={e => { e.stopPropagation(); handleBattleClick(battle); }}
                className="w-full mb-3 py-2.5 bg-purple-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center space-x-2 shadow-[0_3px_0_#5b21b6] active:shadow-none active:translate-y-[3px] transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Rejoin Battle</span>
              </button>
            )}

            {isCompleted ? (
              <div className={`w-full text-center py-2 rounded-lg text-xs font-bold border-2 ${myBet === battle.winner ? 'bg-green-50 border-green-200 text-green-700' : myBet ? 'bg-red-50 border-red-200 text-red-600' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                {myBet === battle.winner ? '🏆 You won! ' : myBet ? '💀 You lost. ' : ''}Winner: {battle.winner}
              </div>
            ) : !myBet ? (
              <div className="flex space-x-2" onClick={e => e.stopPropagation()}>
                {bettingOpen && points >= 50 ? (
                  <>
                    <button onClick={() => setPendingBet({ battleId: battle.id, player: battle.p1.name })} className="flex-1 py-3 bg-blue-50 text-blue-700 text-[11px] font-bold uppercase rounded-lg border-2 border-blue-200 active:bg-blue-100 transition-colors shadow-sm">
                      Bet 50 on {battle.p1.name}
                    </button>
                    <button onClick={() => setPendingBet({ battleId: battle.id, player: battle.p2.name })} className="flex-1 py-3 bg-red-50 text-red-700 text-[11px] font-bold uppercase rounded-lg border-2 border-red-200 active:bg-red-100 transition-colors shadow-sm">
                      Bet 50 on {battle.p2.name}
                    </button>
                  </>
                ) : bettingOpen ? (
                  <div className="flex-1 py-3 bg-yellow-50 text-yellow-700 text-[11px] font-bold uppercase rounded-lg border-2 border-yellow-200 text-center">
                    Need 50 🪙 to bet
                  </div>
                ) : (
                  <div className="flex-1 py-3 bg-gray-100 text-gray-400 text-[11px] font-bold uppercase rounded-lg border-2 border-gray-200 text-center">
                    Betting Closed
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full text-center py-2 bg-gray-50 border-2 border-gray-100 rounded-lg text-xs font-bold text-gray-400">
                Bet placed on {myBet} — result after battle ends
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between" onClick={e => e.stopPropagation()}>
              <div className="flex space-x-1">
                {ALL_EMOJIS.map(key => {
                  const count = (battle.reactions[key] || []).length;
                  const reacted = (battle.reactions[key] || []).includes(user.name);
                  return (
                    <button
                      key={key}
                      onClick={ev => handleEmote(ev, battle.id, key)}
                      className={`text-sm active:scale-95 px-1.5 py-1 rounded-full flex items-center space-x-0.5 border transition-all ${reacted ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100'}`}
                    >
                      <span>{EMOJI_MAP[key]}</span>
                      <span className="text-[9px] font-bold text-gray-500">{count}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCommentModalBattle(battle.id)}
                className="flex items-center space-x-1 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border-2 bg-white border-gray-200 text-gray-500 hover:text-gray-800"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{battle.comments.length}</span>
              </button>
            </div>
          </div>
        );
      })}

      {commentModalBattle && (() => {
        const battle = battles.find(b => b.id === commentModalBattle);
        if (!battle) return null;
        return (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex flex-col justify-end" onClick={() => setCommentModalBattle(null)}>
            <div className="bg-white rounded-t-3xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-4 flex items-center justify-between border-b border-gray-100">
                <h3 className="font-bold text-gray-900">{battle.challenge}</h3>
                <span className="text-[10px] font-bold text-gray-400">{battle.comments.length} comments</span>
                <button onClick={() => setCommentModalBattle(null)} className="p-2 text-gray-400 hover:text-gray-900"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {battle.comments.length === 0 && <p className="text-center text-xs text-gray-300 mt-8">No comments yet. Be the first!</p>}
                {battle.comments.map(c => (
                  <div key={c.id} className="bg-gray-50 rounded-xl p-3">
                    <span className="font-bold text-blue-700 text-xs">{c.user}</span>
                    <p className="text-xs text-gray-600 mt-1">{c.text}</p>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-gray-100 bg-white flex items-center space-x-2">
                <input
                  type="text"
                  value={commentText[battle.id] || ''}
                  onChange={e => setCommentText(prev => ({ ...prev, [battle.id]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleAddComment(battle.id)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-500"
                />
                <button onClick={() => handleAddComment(battle.id)} className="bg-blue-700 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider">Post</button>
              </div>
            </div>
          </div>
        );
      })()}

      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedProfile(null)} />
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 relative z-10 shadow-2xl">
            <button onClick={() => setSelectedProfile(null)} className="absolute top-4 right-4 text-gray-400 bg-gray-50 rounded-full p-1 border border-gray-200"><X className="w-5 h-5" /></button>
            <div className="flex flex-col items-center mt-6 mb-8">
              <div className="relative mb-4">
                <img src={`https://ui-avatars.com/api/?name=${selectedProfile.name}&background=1D4ED8&color=fff&size=128`} className="w-24 h-24 rounded-full border-4 border-gray-50 shadow-xl" alt="avatar" />
                <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-lg border-2 border-white shadow-sm flex items-center">
                  <Flame className="w-3 h-3 mr-0.5 fill-current" /> {selectedProfile.streak}
                </div>
              </div>
              <h2 className="text-2xl font-serif font-bold text-gray-900">{selectedProfile.name}</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col items-center">
                <Trophy className="w-6 h-6 text-yellow-500 mb-2" />
                <span className="text-2xl font-bold text-gray-900">{selectedProfile.wins}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Wins</span>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col items-center">
                <Crosshair className="w-6 h-6 text-red-500 mb-2" />
                <span className="text-2xl font-bold text-gray-900">{Math.floor(selectedProfile.wins * 0.3)}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Losses</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingBet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setPendingBet(null); setBetError(null); }} />
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 relative z-10 shadow-2xl">
            <h3 className="text-2xl font-serif font-bold text-gray-900 mb-2">Confirm Bet</h3>
            <p className="text-sm text-gray-600 mb-2 leading-relaxed">
              Bet <strong className="text-yellow-600">{BET_AMOUNT} Coins</strong> on <strong className="text-blue-700">{pendingBet.player}</strong>?
            </p>
            <p className="text-xs text-gray-400 mb-4">Result is paid out only after the battle ends.</p>
            {betError && (
              <div role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                {betError}
              </div>
            )}
            <div className="flex space-x-3">
              <button onClick={() => { setPendingBet(null); setBetError(null); }} className="flex-1 py-3.5 bg-gray-50 text-gray-600 font-bold text-xs uppercase tracking-wider rounded-xl border border-gray-200">Cancel</button>
              <button onClick={confirmBet} className="flex-1 py-3.5 bg-yellow-400 text-yellow-900 font-bold text-xs uppercase tracking-wider rounded-xl shadow-[0_4px_0_#ca8a04] active:shadow-none active:translate-y-[4px] transition-all">Place Bet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Arena ────────────────────────────────────────────────────────────────────

interface Props {
  setScreen: (s: AppScreen) => void;
  setActiveBattleConfig: React.Dispatch<React.SetStateAction<{ opponent: string; challenge: string; target: number; scheduledTime: number } | null>>;
  setActiveBattleId: React.Dispatch<React.SetStateAction<string | null>>;
  invites: Invite[];
  setInvites: React.Dispatch<React.SetStateAction<Invite[]>>;
  friendRequests: FriendRequest[];
  setFriendRequests: React.Dispatch<React.SetStateAction<FriendRequest[]>>;
  chatThreads: ChatThread[];
  setChatThreads: React.Dispatch<React.SetStateAction<ChatThread[]>>;
  friends: string[];
  allUsers: string[];
  challenges: string[];
  userName: string;
  onSendFriendRequest: (name: string) => void;
  onAcceptFriendRequest: (id: string) => void;
  onRejectFriendRequest: (id: string) => void;
  onCreateInvite: (invite: Invite) => void;
  onSendMessage: (threadId: string, sender: string, text: string, timestamp: number) => void;
  onCreateChatThread: (participants: string[]) => Promise<string>;
  // Battles tab props
  user: UserProfile;
  points: number;
  setPoints: React.Dispatch<React.SetStateAction<number>>;
  battles: LiveBattle[];
  setBattles: React.Dispatch<React.SetStateAction<LiveBattle[]>>;
  bets: Record<string, string>;
  setBets: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  now: number;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  battleFilter: BattleFilter;
  setBattleFilter: React.Dispatch<React.SetStateAction<BattleFilter>>;
  activeBattleId: string | null;
  setBattlesActiveBattleId: React.Dispatch<React.SetStateAction<string | null>>;
  setCurrentScreen: React.Dispatch<React.SetStateAction<AppScreen>>;
  selectedBattleId: string | null;
  setSelectedBattleId: React.Dispatch<React.SetStateAction<string | null>>;
  onNavigateToBattle?: (inviteId: string) => void;
}

const CHALLENGE_TARGETS: Record<string, number> = {
  '10 Pushups': 10, '50 Squats': 50, '2 Min Plank': 120,
  '1 Min Burpees': 30, '100 Jumping Jacks': 100, '30 Second Sprint': 1,
};

export default function Arena({
  setScreen, setActiveBattleConfig, setActiveBattleId,
  invites, setInvites, friendRequests, setFriendRequests,
  chatThreads, setChatThreads, friends, allUsers, challenges,
  userName, onSendFriendRequest, onAcceptFriendRequest, onRejectFriendRequest,
  onCreateInvite, onSendMessage, onCreateChatThread,
  user, points, setPoints, battles, setBattles, bets, setBets, now,
  searchQuery, setSearchQuery, battleFilter, setBattleFilter,
  activeBattleId, setBattlesActiveBattleId, setCurrentScreen,
  selectedBattleId, setSelectedBattleId, onNavigateToBattle,
}: Props) {
  const [tab, setTab] = useState<'challenges'|'chat'|'friends'|'sent'>('challenges');
  const [challengeFilter, setChallengeFilter] = useState<'all'|'live'|'pending'|'expired'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selChallenge, setSelChallenge] = useState(challenges[0]);
  const [customChallenge, setCustomChallenge] = useState('');
  const [selUser, setSelUser] = useState('');
  const [findQuery, setFindQuery] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [schedulePreset, setSchedulePreset] = useState<string | null>('now'); // 'now' | 'in1h' | 'in2h' | 'tomorrow' | null
  const [customSchedule, setCustomSchedule] = useState('');
  // Derived: the actual scheduled time string to use
  const scheduleValue = (() => {
    if (schedulePreset === 'now') { const d = new Date(now); d.setSeconds(0,0); return d.toISOString().slice(0,16); }
    if (schedulePreset === 'in1h') { const d = new Date(now+3600000); d.setSeconds(0,0); return d.toISOString().slice(0,16); }
    if (schedulePreset === 'in2h') { const d = new Date(now+7200000); d.setSeconds(0,0); return d.toISOString().slice(0,16); }
    if (schedulePreset === 'tomorrow') { const d = new Date(now); d.setDate(d.getDate()+1); d.setHours(9,0,0,0); return d.toISOString().slice(0,16); }
    return customSchedule;
  })();
  const [activeChat, setActiveChat] = useState<string|null>(null);
  const [chatInput, setChatInput] = useState('');
  const [friendTab, setFriendTab] = useState<'received'|'sent'>('received');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUserResults, setShowUserResults] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userSearchRef = useRef<HTMLDivElement>(null);

  // Close user search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userSearchRef.current && !userSearchRef.current.contains(e.target as Node)) {
        setShowUserResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function fmtTime(ts: number): string {
    const d = Math.floor((now - ts) / 1000);
    if (d < 60) return 'Just now';
    if (d < 3600) return `${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
    return `${Math.floor(d / 86400)}d ago`;
  }

  const pendingInvites = invites.filter(i => i.to === userName && i.status === 'pending');
  const sentInvites = invites.filter(i => i.from === userName && i.status === 'pending');
  const recReqs = friendRequests.filter(r => r.to === userName && r.status === 'pending');
  const sentReqs = friendRequests.filter(r => r.from === userName && r.status === 'pending');

  // Realtime chat subscription
  useEffect(() => {
    if (!activeChat) return;
    const unsub = subscribeToChat(activeChat, (msg) => {
      setChatThreads(prev => prev.map(t =>
        t.id === activeChat && !t.messages.find(m => m.id === msg.id)
          ? { ...t, messages: [...t.messages, msg] }
          : t
      ));
    });
    return unsub;
  }, [activeChat, setChatThreads]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat, chatThreads]);

  // Track in-flight invite IDs to prevent duplicate submissions
  const [pendingInviteAction, setPendingInviteAction] = useState<Record<string, 'accept' | 'reject'>>({});

  const handleAcceptInvite = async (id: string) => {
    // Guard: already in-flight or invite is no longer pending
    if (pendingInviteAction[id]) return;
    const inv = invites.find(i => i.id === id);
    if (!inv || inv.status !== 'pending') return;

    // Optimistic update — disable button synchronously before any async call
    setPendingInviteAction(prev => ({ ...prev, [id]: 'accept' }));

    const result = await acceptBattleRequest(id);
    if (result && 'error' in result) {
      // Roll back on error
      setPendingInviteAction(prev => { const next = { ...prev }; delete next[id]; return next; });
      if (result.error === 'INVITE_NOT_PENDING') {
        // Invite was already handled — remove it from local state
        setInvites(prev => prev.filter(i => i.id !== id));
      }
      return;
    }

    setInvites(prev => prev.map(i => i.id === id ? { ...i, status: 'accepted' as const } : i));
    setPendingInviteAction(prev => { const next = { ...prev }; delete next[id]; return next; });
    onNavigateToBattle?.(id);
  };

  const handleRejectInvite = async (id: string) => {
    if (pendingInviteAction[id]) return;
    const inv = invites.find(i => i.id === id);
    if (!inv || inv.status !== 'pending') return;

    setPendingInviteAction(prev => ({ ...prev, [id]: 'reject' }));

    const result = await rejectBattleRequest(id);
    if (result && 'error' in result) {
      setPendingInviteAction(prev => { const next = { ...prev }; delete next[id]; return next; });
      if (result.error === 'INVITE_NOT_PENDING') {
        setInvites(prev => prev.filter(i => i.id !== id));
      }
      return;
    }

    setInvites(prev => prev.map(i => i.id === id ? { ...i, status: 'rejected' as const } : i));
    setPendingInviteAction(prev => { const next = { ...prev }; delete next[id]; return next; });
  };

  const handleCreate = async () => {
    const opponent = (selUser || findQuery).trim();
    if (!opponent) { setCreateError('Please select or search for an opponent.'); return; }
    if (opponent === userName) { setCreateError('You cannot challenge yourself!'); return; }
    const challenge = (customChallenge.trim() || selChallenge).trim();
    if (!challenge) { setCreateError('Please pick or type a challenge.'); return; }

    // Normalize schedule to integer seconds first (state-machine canonical unit),
    // then derive milliseconds only for legacy UI state fields.
    const computeScheduledTimeSeconds = (): number | null => {
      if (schedulePreset === 'now') return Math.trunc(now / 1000);
      if (schedulePreset === 'in1h') return Math.trunc((now + 3_600_000) / 1000);
      if (schedulePreset === 'in2h') return Math.trunc((now + 7_200_000) / 1000);
      if (schedulePreset === 'tomorrow') {
        const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0);
        return Math.trunc(d.getTime() / 1000);
      }
      // Custom path
      if (!customSchedule) return null;
      const parsed = new Date(customSchedule).getTime();
      return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed / 1000) : null;
    };
    const scheduledTimeSeconds = computeScheduledTimeSeconds();
    if (scheduledTimeSeconds === null || !Number.isInteger(scheduledTimeSeconds) || scheduledTimeSeconds <= 0) {
      setCreateError('Please pick a valid start time.');
      return;
    }
    const scheduledTime = scheduledTimeSeconds * 1000;

    const newInvite: Invite = {
      id: crypto.randomUUID(),
      from: userName,
      to: opponent,
      challenge,
      scheduledTime,
      status: 'pending',
      isPublic,
      timestamp: Date.now(),
    };
    const result = await createBattleRequest(userName, opponent, challenge, isPublic, scheduledTimeSeconds);
    if (typeof result === 'string') {
      const inviteWithId: Invite = { ...newInvite, id: result };
      onCreateInvite(inviteWithId);
    } else if (result && 'error' in result) {
      if (result.error === 'DUPLICATE_REQUEST') {
        setCreateError('You already have a pending challenge against this opponent for this challenge.');
        return;
      }
      if (result.error === 'INVALID_INPUT') {
        setCreateError('Some fields are missing or invalid. Please review and retry.');
        return;
      }
      setCreateError('Could not create challenge. Please try again.');
      return;
    }
    setShowCreate(false);
    setSelUser('');
    setFindQuery('');
    setShowUserResults(false);
    setCreateError(null);
    setCustomChallenge('');
    setSchedulePreset('now');
    setCustomSchedule('');
    // Don't navigate to battle — wait for opponent to accept
  };

  const sendMsg = () => {
    if (!chatInput.trim() || !activeChat) return;
    const msgId = 'm' + Date.now();
    const ts = Date.now();
    setChatThreads(prev => prev.map(t =>
      t.id === activeChat
        ? { ...t, messages: [...t.messages, { id: msgId, sender: userName, text: chatInput.trim(), timestamp: ts }] }
        : t
    ));
    onSendMessage(activeChat, userName, chatInput.trim(), ts);
    setChatInput('');
  };

  const openChat = async (friendName: string) => {
    const existing = chatThreads.find(t => t.participants.includes(userName) && t.participants.includes(friendName));
    if (existing) { setActiveChat(existing.id); setTab('chat'); return; }
    const id = await onCreateChatThread([userName, friendName]);
    const nt: ChatThread = { id, participants: [userName, friendName], messages: [] };
    setChatThreads(prev => [...prev, nt]);
    setActiveChat(nt.id);
    setTab('chat');
  };

  const thread = chatThreads.find(t => t.id === activeChat);
  if (thread) {
    const other = thread.participants.find(p => p !== userName) || 'Friend';
    return (
      <div className="flex-1 flex flex-col bg-[#FDFCF7] overflow-hidden">
        <div className="p-4 flex items-center border-b border-gray-100 bg-white/90 backdrop-blur-md sticky top-0 z-10">
          <button onClick={() => setActiveChat(null)} className="mr-3 text-gray-400 hover:text-gray-900"><ArrowLeft className="w-5 h-5" /></button>
          <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold mr-3 text-sm">{other[0]}</div>
          <div>
            <h3 className="font-bold text-sm text-gray-900">{other}</h3>
            <p className="text-[10px] text-green-500 font-bold">Online</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#ECE5DD]">
          {thread.messages.length === 0 && (
            <p className="text-center text-xs text-gray-400 mt-8 bg-white/60 rounded-xl px-4 py-2 mx-auto w-fit">No messages yet. Say hello! 👋</p>
          )}
          {thread.messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === userName ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm shadow-sm ${msg.sender === userName ? 'bg-[#DCF8C6] text-gray-900 rounded-br-sm' : 'bg-white text-gray-900 rounded-bl-sm'}`}>
                {msg.sender !== userName && (
                  <p className="text-[10px] font-bold text-green-600 mb-0.5">{msg.sender}</p>
                )}
                <p>{msg.text}</p>
                <span className="text-[9px] text-gray-400 mt-0.5 block text-right">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="shrink-0 sticky bottom-0 p-3 border-t border-gray-200 bg-[#F0F0F0] flex items-center space-x-2">
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMsg()}
            placeholder="Type a message..."
            className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-green-400"
          />
          <button
            onClick={sendMsg}
            className="bg-green-500 text-white w-10 h-10 rounded-full flex items-center justify-center active:scale-95 shadow-md shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (showCreate) {
    const cOptions = challenges;
    const filteredUsers = allUsers.filter(u =>
      u !== userName && u.toLowerCase().includes(findQuery.toLowerCase())
    );
    return (
      <div className="flex-1 overflow-y-auto px-5 pt-8 pb-28 scrollbar-hide bg-[#FDFCF7]">
        <div className="flex items-center mb-6">
          <button onClick={() => { setShowCreate(false); setSelUser(''); setFindQuery(''); setShowUserResults(false); setCreateError(null); setCustomChallenge(''); setSchedulePreset('now'); setCustomSchedule(''); }} className="mr-3 text-gray-400 hover:text-gray-900"><ArrowLeft className="w-5 h-5" /></button>
          <h2 className="text-2xl font-serif font-bold text-gray-900">Create Challenge</h2>
        </div>
        <div className="space-y-5">
          {/* Challenge */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Challenge</label>
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 flex items-center justify-between"
              >
                {customChallenge.trim() ? customChallenge : selChallenge}
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                  {cOptions.map(c => (
                    <button key={c} onClick={() => { setSelChallenge(c); setCustomChallenge(''); setShowDropdown(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl">{c}</button>
                  ))}
                </div>
              )}
            </div>
            <input
              type="text"
              value={customChallenge}
              onChange={e => setCustomChallenge(e.target.value)}
              placeholder="Or type your own challenge (e.g. 30 Pushups)..."
              className="w-full mt-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          {/* Opponent */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Opponent</label>
            {friends.length > 0 && (
              <select value={selUser} onChange={e => { setSelUser(e.target.value); setFindQuery(''); setShowUserResults(false); }} className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 mb-2 outline-none">
                <option value="">Select friend...</option>
                {friends.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            )}
            <div className="relative" ref={userSearchRef}>
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                <input
                  type="text"
                  value={findQuery}
                  onChange={e => { setFindQuery(e.target.value); setSelUser(''); setShowUserResults(true); }}
                  onFocus={() => setShowUserResults(true)}
                  placeholder="Search any user..."
                  className="flex-1 bg-transparent text-sm outline-none"
                />
              </div>
              {showUserResults && findQuery && filteredUsers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg z-20 max-h-40 overflow-y-auto">
                  {filteredUsers.map((u, idx) => (
                    <button key={`${u}-${idx}`} onClick={() => { setFindQuery(u); setSelUser(''); setShowUserResults(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center space-x-2">
                      <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs">{u[0]}</div>
                      <span>{u}</span>
                    </button>
                  ))}
                </div>
              )}
              {showUserResults && findQuery && filteredUsers.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg z-20 px-4 py-3 text-sm text-gray-400">No users found</div>
              )}
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Visibility</label>
            <div className="flex space-x-3">
              <button onClick={() => setIsPublic(true)} className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 border-2 transition-all ${isPublic ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-500 border-gray-200'}`}>
                <Globe className="w-4 h-4" /><span>Public</span>
              </button>
              <button onClick={() => setIsPublic(false)} className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 border-2 transition-all ${!isPublic ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-500 border-gray-200'}`}>
                <Lock className="w-4 h-4" /><span>Private</span>
              </button>
            </div>
          </div>

          {/* Schedule */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">When to Battle?</label>
            {/* Quick presets */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {([
                { label: '⚡ Right Now', key: 'now' },
                { label: '⏰ In 1 Hour', key: 'in1h' },
                { label: '🕑 In 2 Hours', key: 'in2h' },
                { label: '🌅 Tomorrow 9am', key: 'tomorrow' },
              ] as const).map(({ label, key }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setSchedulePreset(key); setCustomSchedule(''); }}
                  className={`py-3 px-3 rounded-xl text-xs font-bold border-2 transition-all text-left ${
                    schedulePreset === key
                      ? 'bg-blue-700 text-white border-blue-700 shadow-[0_3px_0_#1e3a8a]'
                      : 'bg-white text-gray-600 border-gray-200 shadow-[0_3px_0_#e5e7eb] active:shadow-none active:translate-y-0.5'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Custom picker */}
            <div className={`border-2 rounded-xl px-4 py-3 flex items-center space-x-3 transition-all ${schedulePreset !== null ? 'bg-gray-100 border-gray-100 opacity-50' : 'bg-gray-50 border-gray-200'}`}>
              <Clock className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="flex-1">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Custom time</p>
                <input
                  type="datetime-local"
                  value={customSchedule}
                  disabled={schedulePreset !== null}
                  onChange={e => { setCustomSchedule(e.target.value); setSchedulePreset(null); }}
                  className="bg-transparent text-sm font-bold text-gray-900 outline-none w-full disabled:cursor-not-allowed"
                />
              </div>
              {schedulePreset !== null && (
                <button
                  type="button"
                  onClick={() => setSchedulePreset(null)}
                  className="text-[9px] font-bold text-blue-600 uppercase tracking-wider whitespace-nowrap"
                >
                  Use custom
                </button>
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-2 flex items-center">
              <span className="mr-1">📅</span>
              {scheduleValue ? `Starts ${new Date(scheduleValue).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : 'Pick a time'}
            </p>
          </div>

          {createError && (
            <div className="w-full rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-center">
              {createError}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={(!selUser && !findQuery.trim()) || (!selChallenge && !customChallenge.trim())}
            className="w-full bg-blue-700 text-white text-sm font-bold uppercase tracking-widest py-4 rounded-xl shadow-[0_4px_0_#1e3a8a] active:shadow-none active:translate-y-1 transition-all disabled:opacity-50 disabled:shadow-none"
          >
            Create Challenge
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 pt-8 pb-28 scrollbar-hide flex flex-col h-full bg-[#FDFCF7]">
      <div className="flex justify-between items-center mb-6 mt-2">
        <h2 className="text-3xl font-serif font-bold text-gray-900">The Arena</h2>
        <button onClick={() => setShowCreate(true)} className="bg-blue-700 text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-xl shadow-[0_3px_0_#1e3a8a] active:shadow-none active:translate-y-1 transition-all">+ Create</button>
      </div>

      <div className="bg-gray-100 p-1 rounded-xl flex mb-6 shadow-inner">
        {(['challenges', 'friends', 'chat', 'sent'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all capitalize ${tab === t ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>{t}</button>
        ))}
      </div>

      {tab === 'challenges' && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="flex space-x-2 overflow-x-auto scrollbar-hide pb-1">
            {(['all', 'live', 'pending', 'expired'] as const).map(f => (
              <button
                key={f}
                onClick={() => setChallengeFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border-2 transition-all flex-shrink-0 ${
                  challengeFilter === f
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-white text-gray-500 border-gray-200'
                }`}
              >
                {f === 'live' ? '🔴 Live' : f === 'pending' ? '⏳ Pending' : f === 'expired' ? '💀 Expired' : 'All'}
              </button>
            ))}
          </div>
          <div className="space-y-6">
          {sentInvites.length > 0 && (() => {
            const WINDOW_MS = 3600000;
            const allSent = invites.filter(i => i.from === userName);
            const filtered = allSent.filter(inv => {
              const machine = inv.battleStatus ?? (inv.status === 'pending' ? 'PENDING' : inv.status === 'rejected' ? 'REJECTED' : 'ACCEPTED');
              const expired = Date.now() > inv.scheduledTime + WINDOW_MS;
              const isLive = machine === 'LIVE';
              const isPending = machine === 'PENDING';
              if (challengeFilter === 'expired') return expired || inv.status === 'rejected';
              if (challengeFilter === 'live') return !expired && isLive && machine !== 'REJECTED';
              if (challengeFilter === 'pending') return !expired && isPending;
              return true;
            });
            if (filtered.length === 0) return null;
            return (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Your Sent Challenges</h3>
              {filtered.map(inv => {
                const expired = Date.now() > inv.scheduledTime + WINDOW_MS;
                const machine = inv.battleStatus ?? (inv.status === 'pending' ? 'PENDING' : inv.status === 'rejected' ? 'REJECTED' : 'ACCEPTED');
                const isRejected = machine === 'REJECTED' || inv.status === 'rejected';
                const isPending = machine === 'PENDING';
                const isLive = machine === 'LIVE';
                return (
                  <div
                    key={inv.id}
                    onClick={() => {
                      if (expired || isRejected) return;
                      if (isPending) return;
                      if (!isLive) {
                        onNavigateToBattle?.(inv.id);
                        return;
                      }
                      setActiveBattleId(inv.id);
                      setActiveBattleConfig({
                        opponent: inv.to,
                        challenge: inv.challenge,
                        target: CHALLENGE_TARGETS[inv.challenge] || 10,
                        scheduledTime: inv.scheduledTime,
                      });
                      setScreen('battle');
                    }}
                    className={`bg-white border-2 rounded-2xl p-4 shadow-sm flex items-center justify-between ${
                      isRejected ? 'border-red-100 opacity-80' : expired ? 'border-gray-100 opacity-50' : 'border-gray-100 cursor-pointer active:scale-[0.98] transition-transform'
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-gray-900 text-base">vs {inv.to}</h4>
                      <p className="text-[11px] text-blue-700 font-bold uppercase tracking-wide mt-0.5">{inv.challenge}</p>
                      <p className="text-[10px] text-gray-400 mt-1 flex items-center"><Clock className="w-3 h-3 mr-1" />{new Date(inv.scheduledTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      {isRejected && <p className="text-[10px] text-red-500 font-bold mt-1">❌ Rejected by {inv.to}</p>}
                      {expired && !isRejected && <p className="text-[10px] text-red-400 font-bold mt-1">No one joined — expired</p>}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                      isRejected ? 'text-red-600 bg-red-50 border-red-200' :
                      isLive ? 'text-green-600 bg-green-50 border-green-200' :
                      expired ? 'text-gray-400 bg-gray-50 border-gray-200' :
                      !isPending ? 'text-blue-600 bg-blue-50 border-blue-100' :
                      'text-yellow-600 bg-yellow-50 border-yellow-100'
                    }`}>
                      {isRejected ? 'Rejected' : isLive ? 'Enter Arena' : expired ? 'Expired' : !isPending ? 'Start Battle' : 'Pending'}
                    </span>
                  </div>
                );
              })}
            </div>
            );
          })()}
          {pendingInvites.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Incoming Invites</h3>
              {pendingInvites.map(inv => (
                <div key={inv.id} className="bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 text-base">{inv.from}</h4>
                    <p className="text-[11px] text-blue-700 font-bold uppercase tracking-wide mt-0.5">{inv.challenge}</p>
                    <p className="text-[10px] text-gray-400 mt-1 flex items-center"><Clock className="w-3 h-3 mr-1" />{new Date(inv.scheduledTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleRejectInvite(inv.id)}
                      disabled={!!pendingInviteAction[inv.id]}
                      className="w-11 h-11 bg-red-50 rounded-xl flex items-center justify-center text-red-500 border-2 border-red-100 active:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {pendingInviteAction[inv.id] === 'reject' ? <Spinner /> : <X className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => handleAcceptInvite(inv.id)}
                      disabled={!!pendingInviteAction[inv.id]}
                      className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center text-green-600 border-2 border-green-100 active:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {pendingInviteAction[inv.id] === 'accept' ? <Spinner /> : <Check className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {pendingInvites.length === 0 && sentInvites.length === 0 && (
            <div className="bg-gray-50 border-2 border-gray-100 rounded-2xl p-8 text-center">
              <p className="text-sm text-gray-400 font-medium">No active challenges</p>
              <p className="text-[10px] text-gray-300 mt-1">Create a challenge or wait for invites.</p>
            </div>
          )}
          </div>
        </div>
      )}

      {tab === 'friends' && (
        <div className="space-y-6">
          <div className="bg-gray-100 p-1 rounded-xl flex mb-2 shadow-inner">
            <button onClick={() => setFriendTab('received')} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${friendTab === 'received' ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}>Received {recReqs.length > 0 && `(${recReqs.length})`}</button>
            <button onClick={() => setFriendTab('sent')} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${friendTab === 'sent' ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}>Sent</button>
          </div>
          {friendTab === 'received' && (
            <div className="space-y-3">
              {recReqs.length === 0 && <p className="text-center text-xs text-gray-400 py-8">No pending requests</p>}
              {recReqs.map(req => (
                <div key={req.id} className="bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold mr-3">{req.from[0]}</div>
                    <div><h4 className="font-bold text-gray-900 text-sm">{req.from}</h4><p className="text-[10px] text-gray-400">{fmtTime(req.timestamp)}</p></div>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => onRejectFriendRequest(req.id)} className="px-3 py-2 text-[10px] font-bold text-red-500 bg-red-50 rounded-lg border border-red-100"><X className="w-4 h-4" /></button>
                    <button onClick={() => onAcceptFriendRequest(req.id)} className="px-3 py-2 text-[10px] font-bold text-green-600 bg-green-50 rounded-lg border border-green-100"><Check className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {friendTab === 'sent' && (
            <div className="space-y-3">
              {sentReqs.length === 0 && <p className="text-center text-xs text-gray-400 py-8">No sent requests</p>}
              {sentReqs.map(req => (
                <div key={req.id} className="bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold mr-3">{req.to[0]}</div>
                    <div><h4 className="font-bold text-gray-900 text-sm">{req.to}</h4><p className="text-[10px] text-gray-400">{fmtTime(req.timestamp)}</p></div>
                  </div>
                  <span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">Pending</span>
                </div>
              ))}
            </div>
          )}
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Your Friends ({friends.length})</h3>
            {friends.length === 0 && <p className="text-center text-xs text-gray-400 py-4">No friends yet.</p>}
            <div className="space-y-2">
              {friends.map(f => (
                <div key={f} onClick={() => openChat(f)} className="bg-white border-2 border-gray-100 rounded-2xl p-3 shadow-sm flex items-center cursor-pointer active:scale-[0.98] transition-transform">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold mr-3">{f[0]}</div>
                  <div className="flex-1"><h4 className="font-bold text-gray-900 text-sm">{f}</h4></div>
                  <button onClick={e => { e.stopPropagation(); openChat(f); }} className="text-green-600 text-[10px] font-bold uppercase tracking-wider">Chat</button>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Add Friend</h3>
            <div className="space-y-2">
              {allUsers.filter(u => u !== userName && !friends.includes(u) && !sentReqs.some(r => r.to === u)).map(u => (
                <div key={u} className="bg-white border-2 border-gray-100 rounded-2xl p-3 shadow-sm flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold mr-3">{u[0]}</div>
                    <h4 className="font-bold text-gray-900 text-sm">{u}</h4>
                  </div>
                  <button onClick={() => onSendFriendRequest(u)} className="p-2 bg-blue-50 rounded-lg text-blue-700 active:bg-blue-100"><UserPlus className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'chat' && (
        <div className="space-y-3">
          {chatThreads.length === 0 && <p className="text-center text-xs text-gray-400 py-8">No conversations yet</p>}
          {chatThreads.map(t => {
            const other = t.participants.find(p => p !== userName) || 'Friend';
            const lastMsg = t.messages[t.messages.length - 1];
            return (
              <div key={t.id} onClick={() => setActiveChat(t.id)} className="bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-sm flex items-center cursor-pointer active:scale-[0.98] transition-transform">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-700 mr-4 font-bold text-lg border-2 border-white shadow-sm">{other[0]}</div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h4 className="font-bold text-gray-900">{other}</h4>
                    {lastMsg && <span className="text-[10px] text-gray-400 font-bold">{fmtTime(lastMsg.timestamp)}</span>}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{lastMsg ? lastMsg.text : 'Tap to start chatting'}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'sent' && (
        <SentRequestsTab
          userName={userName}
          invites={invites as unknown as BattleInvite[]}
          onInviteStatusChange={(id, status) => {
            setInvites(prev => prev.map(i => i.id === id ? { ...i, status: status.toLowerCase() as Invite['status'] } : i));
          }}
        />
      )}

    </div>
  );
}
