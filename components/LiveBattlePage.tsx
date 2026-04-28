import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Clock, Zap, MessageCircle, Trophy } from 'lucide-react';
import { LiveBattle, UserProfile, BetRecord } from '../types';
import { subscribeToBattle, subscribeLivestreamChannel, sendGift, castPollVote, getPollVotes } from '../lib/db';
import { BET_AMOUNT } from '../lib/betLogic';
import { GIFT_COSTS } from '../lib/giftLogic';
import { GiftType, GiftEffect as GiftEffectType, FloatingReaction, RepPulseEvent, RepPulseBroadcast, ReactionBroadcast, GiftBroadcast, PollVoteBroadcast } from '../types';
import RepPulse from './livestream/RepPulse';
import CrowdMomentum from './livestream/CrowdMomentum';
import HypeReactions from './livestream/HypeReactions';
import GiftEffect from './livestream/GiftEffect';
import PredictionPoll from './livestream/PredictionPoll';
import GiftTray from './livestream/GiftTray';
import { supabase } from '../lib/supabase';

const ALL_EMOJIS = ['fire', 'crown', 'laugh', 'angry', 'sad'];
const EMOJI_MAP: Record<string, string> = { fire: '🔥', crown: '👑', laugh: '😂', angry: '😡', sad: '😭' };

interface Props {
  battle: LiveBattle | null;
  user: UserProfile;
  bets: Record<string, string>;
  setBets: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  points: number;
  setPoints: React.Dispatch<React.SetStateAction<number>>;
  setBattles: React.Dispatch<React.SetStateAction<LiveBattle[]>>;
  betHistory: BetRecord[];
  setBetHistory: React.Dispatch<React.SetStateAction<BetRecord[]>>;
  now: number;
  onBack: () => void;
  onJoinBattle: (battle: LiveBattle) => void;
}

export default function LiveBattlePage({
  battle: initialBattle, user, bets, setBets, points, setPoints,
  setBattles, betHistory, setBetHistory, now, onBack, onJoinBattle,
}: Props) {
  const [battle, setBattle] = useState<LiveBattle | null>(initialBattle);
  const [commentText, setCommentText] = useState('');
  const [pendingBet, setPendingBet] = useState<string | null>(null);
  const [countdown, setCountdown] = useState('');

  // Livestream state
  const [bettingLocked, setBettingLocked] = useState(false);
  const [repPulses, setRepPulses] = useState<RepPulseEvent[]>([]);
  const [momentumScore, setMomentumScore] = useState(50);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [giftQueue, setGiftQueue] = useState<GiftEffectType[]>([]);
  const [activeGiftEffect, setActiveGiftEffect] = useState<GiftEffectType | null>(null);
  const [pollVotes, setPollVotes] = useState<Record<string, number>>({});
  const [myPollVote, setMyPollVote] = useState<string | null>(null);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const lastReactTime = useRef<number>(0);
  const livestreamChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Sync with parent battle updates
  useEffect(() => { setBattle(initialBattle); }, [initialBattle]);

  // Supabase Realtime subscription
  useEffect(() => {
    if (!battle?.id) return;
    const unsub = subscribeToBattle(battle.id, (update) => {
      setBattle(prev => prev ? { ...prev, ...update } as LiveBattle : prev);
      setBattles(prev => prev.map(b => b.id === battle.id ? { ...b, ...update } as LiveBattle : b));
    });
    return unsub;
  }, [battle?.id, setBattles]);

  // Countdown for upcoming battles
  useEffect(() => {
    if (!battle?.scheduledTime || battle.status !== 'upcoming') return;
    const tick = () => {
      const diff = battle.scheduledTime! - Date.now();
      if (diff <= 0) { setCountdown('Starting now!'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [battle?.scheduledTime, battle?.status]);

  // Betting lock
  useEffect(() => {
    if (battle?.status === 'live' || battle?.status === 'completed' || battle?.status === 'forfeited') {
      setBettingLocked(true);
    }
  }, [battle?.status]);

  // Livestream channel subscription
  useEffect(() => {
    if (!battle?.id || battle.status !== 'live') return;

    const channel = supabase.channel(`livestream:${battle.id}`);
    livestreamChannelRef.current = channel;

    const unsub = subscribeLivestreamChannel(battle.id, {
      onRepPulse: (event: RepPulseBroadcast) => {
        const pulse: RepPulseEvent = { id: crypto.randomUUID(), player: event.player, count: event.count, timestamp: event.timestamp };
        setRepPulses(prev => [...prev, pulse]);
        setMomentumScore(prev => {
          const gain = event.count * 3;
          return event.player === 'p1' ? Math.min(100, prev + gain) : Math.max(0, prev - gain);
        });
        setTimeout(() => setRepPulses(prev => prev.filter(p => p.id !== pulse.id)), 600);
      },
      onReaction: (event: ReactionBroadcast) => {
        const reaction: FloatingReaction = { id: crypto.randomUUID(), emoji: event.emoji, x: event.x, timestamp: event.timestamp };
        setFloatingReactions(prev => {
          const next = [...prev, reaction];
          return next.length > 20 ? next.slice(next.length - 20) : next;
        });
        setTimeout(() => setFloatingReactions(prev => prev.filter(r => r.id !== reaction.id)), 1500);
      },
      onGift: (event: GiftBroadcast) => {
        const effect: GiftEffectType = { id: crypto.randomUUID(), giftType: event.giftType, senderName: event.senderName, timestamp: event.timestamp };
        setGiftQueue(prev => prev.length >= 5 ? prev : [...prev, effect]);
      },
      onPollVote: (event: PollVoteBroadcast) => {
        setPollVotes(event.totalVotes);
      },
      onSpectatorCount: (event) => {
        setSpectatorCount(event.count);
      },
    });

    return () => {
      unsub();
      livestreamChannelRef.current = null;
    };
  }, [battle?.id, battle?.status]);

  // Momentum decay interval
  useEffect(() => {
    if (battle?.status !== 'live') return;
    const interval = setInterval(() => {
      setMomentumScore(prev => Math.round(prev + (50 - prev) * 0.05));
    }, 2000);
    return () => clearInterval(interval);
  }, [battle?.status]);

  // Gift queue dequeue
  useEffect(() => {
    if (activeGiftEffect === null && giftQueue.length > 0) {
      const [next, ...rest] = giftQueue;
      setActiveGiftEffect(next);
      setGiftQueue(rest);
    }
  }, [activeGiftEffect, giftQueue]);

  // Load initial poll votes
  useEffect(() => {
    if (!battle?.id) return;
    getPollVotes(battle.id).then(votes => setPollVotes(votes));
  }, [battle?.id]);

  if (!battle) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#FDFCF7]">
        <button onClick={onBack} className="absolute top-6 left-6 text-gray-400"><ArrowLeft className="w-6 h-6" /></button>
        <p className="text-gray-400 font-bold">Battle not found</p>
      </div>
    );
  }

  const myBet = bets[battle.id];
  const isCompleted = !!battle.winner || battle.status === 'completed' || battle.status === 'forfeited';
  const isLive = !isCompleted && battle.scheduledTime !== undefined && battle.scheduledTime <= now;
  const isUpcoming = !isCompleted && battle.scheduledTime !== undefined && battle.scheduledTime > now;
  const bettingOpen = battle.scheduledTime ? now < battle.scheduledTime : battle.bettingOpen;
  const isParticipant = battle.p1.name === user.name || battle.p2.name === user.name;

  const handleEmote = (key: string) => {
    setBattle(prev => {
      if (!prev) return prev;
      const current = prev.reactions[key] || [];
      const already = current.includes(user.name);
      return { ...prev, reactions: { ...prev.reactions, [key]: already ? current.filter(n => n !== user.name) : [...current, user.name] } };
    });
    setBattles(prev => prev.map(b => {
      if (b.id !== battle.id) return b;
      const current = b.reactions[key] || [];
      const already = current.includes(user.name);
      return { ...b, reactions: { ...b.reactions, [key]: already ? current.filter(n => n !== user.name) : [...current, user.name] } };
    }));
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    const newComment = { id: Date.now().toString(), user: user.name, text: commentText.trim() };
    setBattle(prev => prev ? { ...prev, comments: [...prev.comments, newComment] } : prev);
    setBattles(prev => prev.map(b => b.id === battle.id ? { ...b, comments: [...b.comments, newComment] } : b));
    setCommentText('');
  };

  const confirmBet = () => {
    if (!pendingBet || myBet || points < BET_AMOUNT || !battle) return;
    setPoints(p => p - BET_AMOUNT);
    setBets(prev => ({ ...prev, [battle.id]: pendingBet }));
    setBetHistory(prev => [...prev, {
      id: 'bet-' + Date.now(),
      battleId: battle.id,
      battleName: `${battle.p1.name} vs ${battle.p2.name} — ${battle.challenge}`,
      challenge: battle.challenge,
      playerBetOn: pendingBet,
      opponent: pendingBet === battle.p1.name ? battle.p2.name : battle.p1.name,
      amount: BET_AMOUNT,
      winner: '',
      status: 'lost' as const, // will be updated when battle resolves
      timestamp: Date.now(),
    }]);
    setPendingBet(null);
  };

  const handlePollVote = (player: string) => {
    if (myPollVote || !battle?.id) return;
    setMyPollVote(player);
    setPollVotes(prev => ({ ...prev, [player]: (prev[player] || 0) + 1 }));
    if (livestreamChannelRef.current) {
      castPollVote(battle.id, user.name, player, livestreamChannelRef.current).catch(() => {});
    }
  };

  const handleReact = (emoji: string) => {
    const now = Date.now();
    if (now - lastReactTime.current < 300) return;
    lastReactTime.current = now;
    const x = Math.floor(Math.random() * 80) + 10;
    const reaction: FloatingReaction = { id: crypto.randomUUID(), emoji, x, timestamp: now };
    setFloatingReactions(prev => {
      const next = [...prev, reaction];
      return next.length > 20 ? next.slice(next.length - 20) : next;
    });
    setTimeout(() => setFloatingReactions(prev => prev.filter(r => r.id !== reaction.id)), 1500);
    if (livestreamChannelRef.current) {
      livestreamChannelRef.current.send({
        type: 'broadcast',
        event: 'reaction',
        payload: { type: 'reaction', emoji, senderName: user.name, x, timestamp: now },
      });
    }
  };

  const handleSendGift = async (giftType: GiftType) => {
    if (!battle?.id || !livestreamChannelRef.current) return;
    const cost = GIFT_COSTS[giftType];
    if (points < cost) return;
    const success = await sendGift(battle.id, user.name, giftType, cost, livestreamChannelRef.current);
    if (success) setPoints(p => p - cost);
  };

  const totalVotes = Object.values(pollVotes).reduce((a, b) => a + b, 0);

  return (
    <div className="flex-1 flex flex-col bg-[#FDFCF7] overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-10">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-gray-900"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex items-center space-x-2">
          {isLive && (
            <div className="flex items-center space-x-1.5 bg-red-100 px-3 py-1.5 rounded-full border border-red-200">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-black text-red-600 tracking-widest">LIVE</span>
              {spectatorCount > 0 && (
                <span className="text-[10px] font-bold text-gray-400 ml-1">👁 {spectatorCount}</span>
              )}
            </div>
          )}
          {isUpcoming && (
            <div className="flex items-center space-x-1.5 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100">
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs font-black text-orange-500">{countdown}</span>
            </div>
          )}
          {isCompleted && (
            <div className="flex items-center space-x-1.5 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
              <Trophy className="w-3.5 h-3.5 text-green-600" />
              <span className="text-xs font-black text-green-600">ENDED</span>
            </div>
          )}
        </div>
        <span className="text-[10px] font-bold bg-yellow-50 border border-yellow-200 text-yellow-700 px-2 py-1 rounded-lg">Pool: {battle.pool} 🪙</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Challenge title */}
        <div className="px-5 pt-5 pb-3 text-center">
          <h2 className="text-2xl font-serif font-bold text-gray-900">{battle.challenge}</h2>
          {battle.scheduledTime && (
            <p className="text-xs text-gray-400 mt-1">
              {isUpcoming ? `Starts ${new Date(battle.scheduledTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : `Started ${new Date(battle.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          )}
        </div>

        {/* Players */}
        <div className="px-5 pb-4">
          <div className="flex items-center justify-between bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="relative flex flex-col items-center flex-1">
              <RepPulse pulses={repPulses} side="p1" />
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 font-bold text-xl mb-2 border-2 border-orange-400">
                {battle.p1.name[0]}
              </div>
              <span className="text-sm font-bold text-gray-900">{battle.p1.name}</span>
              <span className="text-[10px] text-gray-400">{battle.p1.wins}W • {battle.p1.streak}🔥</span>
              <div className="w-20 bg-gray-100 h-2 rounded-full mt-2 overflow-hidden">
                <div className="bg-orange-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, (battle.p1Reps / battle.target) * 100)}%` }} />
              </div>
              <span className="text-xs font-black text-orange-500 mt-1">{battle.p1Reps}/{battle.target}</span>
            </div>

            <div className="flex flex-col items-center px-3">
              <span className="text-lg font-serif italic text-gray-300 font-bold">VS</span>
              {isCompleted && battle.winner && (
                <div className="mt-2 text-center">
                  <Trophy className="w-5 h-5 text-yellow-500 mx-auto" />
                  <span className="text-[10px] font-bold text-yellow-600">{battle.winner}</span>
                </div>
              )}
            </div>

            <div className="relative flex flex-col items-center flex-1">
              <RepPulse pulses={repPulses} side="p2" />
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-700 font-bold text-xl mb-2 border-2 border-red-500">
                {battle.p2.name[0]}
              </div>
              <span className="text-sm font-bold text-gray-900">{battle.p2.name}</span>
              <span className="text-[10px] text-gray-400">{battle.p2.wins}W • {battle.p2.streak}🔥</span>
              <div className="w-20 bg-gray-100 h-2 rounded-full mt-2 overflow-hidden">
                <div className="bg-red-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, (battle.p2Reps / battle.target) * 100)}%` }} />
              </div>
              <span className="text-xs font-black text-red-500 mt-1">{battle.p2Reps}/{battle.target}</span>
            </div>
          </div>
        </div>

        {/* Live Engagement Panel */}
        {battle.status === 'live' && (
          <div className="px-5 pb-4 space-y-3">
            <CrowdMomentum
              p1Name={battle.p1.name}
              p2Name={battle.p2.name}
              momentumScore={momentumScore}
            />
            <PredictionPoll
              p1Name={battle.p1.name}
              p2Name={battle.p2.name}
              votes={pollVotes}
              myVote={myPollVote}
              onVote={handlePollVote}
            />
            <GiftTray
              onSendGift={handleSendGift}
              userPoints={points}
              isLive={true}
            />
            <HypeReactions
              reactions={floatingReactions}
              onReact={handleReact}
            />
          </div>
        )}

        {/* Join Battle button for participants */}
        {isParticipant && !isCompleted && (
          <div className="px-5 pb-4">
            <button
              onClick={() => onJoinBattle(battle)}
              className="w-full py-4 bg-orange-500 text-white font-black uppercase tracking-widest rounded-2xl shadow-[0_5px_0_#c2410c] active:shadow-none active:translate-y-[5px] transition-all flex items-center justify-center space-x-2"
            >
              <Zap className="w-5 h-5 fill-current" />
              <span>Go Live — Join Battle</span>
            </button>
          </div>
        )}

        {/* Betting */}
        <div className="px-5 pb-4">
          {bettingLocked && !isCompleted ? (
            <div className="flex-1 py-3 bg-gray-100 text-gray-500 text-[11px] font-black uppercase rounded-xl border-2 border-gray-200 text-center tracking-widest">
              BETTING CLOSED 🔒
            </div>
          ) : isCompleted ? (
            <div className={`w-full text-center py-3 rounded-xl text-sm font-bold border-2 ${myBet === battle.winner ? 'bg-green-50 border-green-200 text-green-700' : myBet ? 'bg-red-50 border-red-200 text-red-600' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
              {myBet === battle.winner ? '🏆 You won! ' : myBet ? '💀 You lost. ' : ''}Winner: {battle.winner}
            </div>
          ) : !myBet ? (
            <div className="flex space-x-2">
              {bettingOpen && points >= BET_AMOUNT ? (
                <>
                  <button onClick={() => setPendingBet(battle.p1.name)} className="flex-1 py-3 bg-orange-50 text-orange-500 text-[11px] font-bold uppercase rounded-xl border-2 border-orange-200 active:bg-orange-100">Bet 50 on {battle.p1.name}</button>
                  <button onClick={() => setPendingBet(battle.p2.name)} className="flex-1 py-3 bg-red-50 text-red-700 text-[11px] font-bold uppercase rounded-xl border-2 border-red-200 active:bg-red-100">Bet 50 on {battle.p2.name}</button>
                </>
              ) : bettingOpen ? (
                <div className="flex-1 py-3 bg-yellow-50 text-yellow-700 text-[11px] font-bold uppercase rounded-xl border-2 border-yellow-200 text-center">Need 50 🪙 to bet</div>
              ) : (
                <div className="flex-1 py-3 bg-gray-100 text-gray-400 text-[11px] font-bold uppercase rounded-xl border-2 border-gray-200 text-center">Betting Closed</div>
              )}
            </div>
          ) : (
            <div className="w-full text-center py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-xs font-bold text-gray-400">
              Bet placed on {myBet} — result after battle ends
            </div>
          )}
        </div>

        {/* Reactions */}
        <div className="px-5 pb-4">
          <div className="flex space-x-2 justify-center">
            {ALL_EMOJIS.map(key => {
              const count = (battle.reactions[key] || []).length;
              const reacted = (battle.reactions[key] || []).includes(user.name);
              return (
                <button key={key} onClick={() => handleEmote(key)} className={`flex flex-col items-center px-3 py-2 rounded-xl border-2 transition-all active:scale-95 ${reacted ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-100'}`}>
                  <span className="text-xl">{EMOJI_MAP[key]}</span>
                  <span className="text-[10px] font-bold text-gray-500 mt-0.5">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Post-battle poll */}
        {isCompleted && (
          <div className="px-5 pb-4">
            <div className="bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center">
                <Trophy className="w-4 h-4 mr-2 text-yellow-500" />
                Community Poll — Who won?
              </h3>
              {[battle.p1.name, battle.p2.name].map(player => {
                const votes = pollVotes[player] || 0;
                const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                return (
                  <button
                    key={player}
                    onClick={() => handlePollVote(player)}
                    disabled={!!myPollVote}
                    className={`w-full mb-2 rounded-xl overflow-hidden border-2 transition-all ${myPollVote === player ? 'border-orange-400' : 'border-gray-100'}`}
                  >
                    <div className="relative bg-gray-50 px-4 py-3 flex items-center justify-between">
                      <div className="absolute left-0 top-0 h-full bg-orange-100 transition-all" style={{ width: `${pct}%` }} />
                      <span className="relative font-bold text-sm text-gray-900">{player}</span>
                      <span className="relative text-xs font-bold text-gray-500">{pct}% ({votes})</span>
                    </div>
                  </button>
                );
              })}
              {!myPollVote && <p className="text-[10px] text-gray-400 text-center mt-2">Tap to vote</p>}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="px-5 pb-6">
          <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center">
            <MessageCircle className="w-4 h-4 mr-2 text-gray-400" />
            Comments ({battle.comments.length})
          </h3>
          <div className="space-y-2 mb-3">
            {battle.comments.length === 0 && (
              <p className="text-center text-xs text-gray-300 py-4">No comments yet. Be the first!</p>
            )}
            {battle.comments.map(c => (
              <div key={c.id} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                <span className="font-bold text-orange-500 text-xs">{c.user}</span>
                <p className="text-xs text-gray-600 mt-0.5">{c.text}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddComment()}
              placeholder="Add a comment..."
              className="flex-1 bg-white border-2 border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-400"
            />
            <button onClick={handleAddComment} className="bg-orange-500 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider">Post</button>
          </div>
        </div>
      </div>

      {/* Bet confirmation modal */}
      {pendingBet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPendingBet(null)} />
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 relative z-10 shadow-2xl">
            <h3 className="text-2xl font-serif font-bold text-gray-900 mb-2">Confirm Bet</h3>
            <p className="text-sm text-gray-600 mb-2">Bet <strong className="text-yellow-600">50 Coins</strong> on <strong className="text-orange-500">{pendingBet}</strong>?</p>
            <p className="text-xs text-gray-400 mb-8">Result paid out when battle ends.</p>
            <div className="flex space-x-3">
              <button onClick={() => setPendingBet(null)} className="flex-1 py-3.5 bg-gray-50 text-gray-600 font-bold text-xs uppercase tracking-wider rounded-xl border border-gray-200">Cancel</button>
              <button onClick={confirmBet} className="flex-1 py-3.5 bg-yellow-400 text-yellow-900 font-bold text-xs uppercase tracking-wider rounded-xl shadow-[0_4px_0_#ca8a04] active:shadow-none active:translate-y-[4px] transition-all">Place Bet</button>
            </div>
          </div>
        </div>
      )}

      <GiftEffect
        effect={activeGiftEffect}
        onComplete={() => setActiveGiftEffect(null)}
      />
    </div>
  );
}
