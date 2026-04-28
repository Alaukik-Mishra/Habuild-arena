import React, { useState } from 'react';
import { UserProfile, LiveBattle, PlayerStats, AppScreen } from '../types';
import { Coins, Zap, MessageCircle, Clock, Link as LinkIcon, Crosshair, Flame, Trophy, X, Search, RotateCcw } from 'lucide-react';
import { filterBattles, BattleFilter } from '../lib/filters';

interface Props {
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

const ALL_EMOJIS = ['fire', 'crown', 'laugh', 'angry', 'sad'];
const EMOJI_MAP: Record<string, string> = { fire: '??', crown: '??', laugh: '??', angry: '??', sad: '??' };

export default function Dashboard({
  user, points, setPoints, battles, setBattles, bets, setBets, now,
  searchQuery, setSearchQuery, battleFilter, setBattleFilter,
  activeBattleId, setActiveBattleId, setActiveBattleConfig, setCurrentScreen,
  selectedBattleId, setSelectedBattleId,
}: Props) {
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [selectedProfile, setSelectedProfile] = useState<PlayerStats | null>(null);
  const [pendingBet, setPendingBet] = useState<{ battleId: string; player: string } | null>(null);
  const [commentModalBattle, setCommentModalBattle] = useState<string | null>(null);

  // suppress unused warning
  void selectedBattleId;

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

  const confirmBet = () => {
    if (!pendingBet) return;
    const { battleId, player } = pendingBet;
    if (bets[battleId]) return;
    if (points >= 50) {
      setPoints(p => p - 50);
      setBets(prev => ({ ...prev, [battleId]: player }));
    }
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

  const filteredBattles = filterBattles(battles, battleFilter, searchQuery, now);

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
    <div className="flex-1 overflow-y-auto px-5 pt-8 pb-28 scrollbar-hide">
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="font-bold text-xs uppercase tracking-wider text-gray-500">Welcome back,</p>
          <h2 className="text-2xl font-serif font-bold text-gray-900">{user.name}</h2>
        </div>
        <div className="bg-yellow-100 border-2 border-yellow-400 text-yellow-700 px-3 py-1.5 rounded-xl font-bold flex items-center shadow-[0_3px_0_#facc15]">
          <Coins className="w-4 h-4 mr-1 pb-px" />
          {points}
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-5 text-white mb-8 shadow-lg relative overflow-hidden flex items-center justify-between">
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
              {f === 'live' ? '?? Live' : f === 'upcoming' ? '? Soon' : f === 'completed' ? '? Done' : 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
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
          const canRejoin = amParticipant && !isCompleted && activeBattleId !== battle.id;

          return (
            <div
              key={battle.id}
              onClick={() => handleBattleClick(battle)}
              className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-[0_5px_0_#e5e7eb] mb-2 flex flex-col relative cursor-pointer active:shadow-[0_2px_0_#e5e7eb] active:translate-y-[3px] transition-all"
            >
              <div className="flex justify-between items-start border-b border-gray-100 pb-3 mb-3">
                <div className="flex flex-col flex-1 mr-2">
                  <h4 className="font-serif text-lg font-bold text-orange-500 leading-tight">{battle.challenge}</h4>
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    {isCompleted ? (
                      <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200 text-[10px] font-bold uppercase">Completed</span>
                    ) : isUpcoming ? (
                      <span className="text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200 flex items-center text-[10px] font-bold uppercase">
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
                  Pool: {battle.pool} ??
                </span>
              </div>

              <div className="flex justify-between items-center mb-4">
                <div onClick={e => { e.stopPropagation(); setSelectedProfile(battle.p1); }} className="flex flex-col items-center flex-1 cursor-pointer">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 font-bold mb-1 border-2 border-orange-400 shadow-sm">{battle.p1.name[0]}</div>
                  <span className="text-[10px] font-bold text-gray-800">{battle.p1.name}</span>
                  <div className="text-[8px] text-gray-400 font-bold bg-gray-50 px-1.5 py-0.5 rounded mt-0.5">{battle.p1.wins}W • {battle.p1.streak}??</div>
                  <div className="w-16 bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-orange-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, (battle.p1Reps / battle.target) * 100)}%` }} />
                  </div>
                  <span className="text-[9px] text-gray-400 mt-0.5">{battle.p1Reps}/{battle.target}</span>
                </div>
                <div className="text-xs font-serif italic text-gray-400 font-bold px-2">VS</div>
                <div onClick={e => { e.stopPropagation(); setSelectedProfile(battle.p2); }} className="flex flex-col items-center flex-1 cursor-pointer">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-700 font-bold mb-1 border-2 border-red-500 shadow-sm">{battle.p2.name[0]}</div>
                  <span className="text-[10px] font-bold text-gray-800">{battle.p2.name}</span>
                  <div className="text-[8px] text-gray-400 font-bold bg-gray-50 px-1.5 py-0.5 rounded mt-0.5">{battle.p2.wins}W • {battle.p2.streak}??</div>
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
                  {myBet === battle.winner ? '?? You won! ' : myBet ? '?? You lost. ' : ''}Winner: {battle.winner}
                </div>
              ) : !myBet ? (
                <div className="flex space-x-2" onClick={e => e.stopPropagation()}>
                  {bettingOpen && points >= 50 ? (
                    <>
                      <button onClick={() => setPendingBet({ battleId: battle.id, player: battle.p1.name })} className="flex-1 py-3 bg-orange-50 text-orange-500 text-[11px] font-bold uppercase rounded-lg border-2 border-orange-200 active:bg-orange-100 transition-colors shadow-sm">Bet 50 on {battle.p1.name}</button>
                      <button onClick={() => setPendingBet({ battleId: battle.id, player: battle.p2.name })} className="flex-1 py-3 bg-red-50 text-red-700 text-[11px] font-bold uppercase rounded-lg border-2 border-red-200 active:bg-red-100 transition-colors shadow-sm">Bet 50 on {battle.p2.name}</button>
                    </>
                  ) : bettingOpen ? (
                    <div className="flex-1 py-3 bg-yellow-50 text-yellow-700 text-[11px] font-bold uppercase rounded-lg border-2 border-yellow-200 text-center">Need 50 ?? to bet</div>
                  ) : (
                    <div className="flex-1 py-3 bg-gray-100 text-gray-400 text-[11px] font-bold uppercase rounded-lg border-2 border-gray-200 text-center">Betting Closed</div>
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
      </div>

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
                    <span className="font-bold text-orange-500 text-xs">{c.user}</span>
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
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-400"
                />
                <button onClick={() => handleAddComment(battle.id)} className="bg-orange-500 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider">Post</button>
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
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPendingBet(null)} />
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 relative z-10 shadow-2xl">
            <h3 className="text-2xl font-serif font-bold text-gray-900 mb-2">Confirm Bet</h3>
            <p className="text-sm text-gray-600 mb-2 leading-relaxed">
              Bet <strong className="text-yellow-600">50 Coins</strong> on <strong className="text-orange-500">{pendingBet.player}</strong>?
            </p>
            <p className="text-xs text-gray-400 mb-8">Result is paid out only after the battle ends.</p>
            <div className="flex space-x-3">
              <button onClick={() => setPendingBet(null)} className="flex-1 py-3.5 bg-gray-50 text-gray-600 font-bold text-xs uppercase tracking-wider rounded-xl border border-gray-200">Cancel</button>
              <button onClick={confirmBet} className="flex-1 py-3.5 bg-yellow-400 text-yellow-900 font-bold text-xs uppercase tracking-wider rounded-xl shadow-[0_4px_0_#ca8a04] active:shadow-none active:translate-y-[4px] transition-all">Place Bet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
