"use client";
import { useState, useEffect, useRef } from 'react';
import { Swords, Share2, Trophy, Frown, ArrowLeft, Clock, PlayCircle, Zap, Star, AlertTriangle } from 'lucide-react';
import { broadcastRepPulse } from '../lib/db';

interface BattleConfig {
  opponent: string;
  challenge: string;
  target: number;
  scheduledTime: number;
}

interface Props {
  onBack: () => void;
  config: BattleConfig;
  userName: string;
  onWithdraw: (battleId: string, userName: string) => void;
  activeBattleId: string;
  onBattleEnd?: (battleId: string) => void;
  playerSide?: 'p1' | 'p2';
}

type GameState = 'waiting' | 'playing' | 'victory' | 'loss' | 'timeUp';

const INITIAL_TIME_SECONDS = 120;
const GRACE_PERIOD_SECONDS = 3600; // 1 hour window to join

export default function Battle({ onBack, config, userName, onWithdraw, activeBattleId, onBattleEnd, playerSide }: Props) {
  const [gameState, setGameState] = useState<GameState>('waiting');
  const [userReps, setUserReps] = useState(0);
  const [opponentReps, setOpponentReps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME_SECONDS);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const hasEnded = useRef(false);

  const opponentName = config.opponent;
  const targetReps = config.target;
  const nowMs = Date.now();
  const scheduledPassed = nowMs >= config.scheduledTime;
  const secondsLate = scheduledPassed ? Math.floor((nowMs - config.scheduledTime) / 1000) : 0;
  const isLate = scheduledPassed && secondsLate > GRACE_PERIOD_SECONDS && gameState === 'waiting';

  // Auto-forfeit when user leaves/closes app
  useEffect(() => {
    if (gameState !== 'playing') return;
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' && !hasEnded.current) {
        hasEnded.current = true;
        onWithdraw(activeBattleId, userName);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleVisibility);
    };
  }, [gameState, activeBattleId, userName, onWithdraw]);

  // Countdown timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    const id = setInterval(() => {
      setTimeLeft(prev => {
        const next = Math.max(0, prev - 1);
        if (next === 0) setGameState('timeUp');
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [gameState]);

  // Opponent AI
  useEffect(() => {
    if (gameState !== 'playing') return;
    const id = setInterval(() => {
      if (Math.random() > 0.65) {
        setOpponentReps(prev => {
          const next = prev + 1;
          if (next >= targetReps && !hasEnded.current) {
            hasEnded.current = true;
            setGameState('loss');
            onBattleEnd?.(activeBattleId);
          }
          return next;
        });
      }
    }, 1200);
    return () => clearInterval(id);
  }, [gameState, targetReps, activeBattleId, onBattleEnd]);

  const handleUserRep = () => {
    if (gameState !== 'playing') return;
    broadcastRepPulse(activeBattleId, playerSide ?? 'p1', 1).catch(() => {});
    setUserReps(prev => {
      const next = prev + 1;
      if (next >= targetReps && !hasEnded.current) {
        hasEnded.current = true;
        setGameState('victory');
        onBattleEnd?.(activeBattleId);
      }
      return next;
    });
  };

  const resetGame = () => {
    hasEnded.current = false;
    setUserReps(0);
    setOpponentReps(0);
    setTimeLeft(INITIAL_TIME_SECONDS);
    setGameState('playing');
  };

  const confirmWithdraw = () => {
    hasEnded.current = true;
    setShowWithdrawConfirm(false);
    onWithdraw(activeBattleId, userName);
  };

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Scheduled but not yet started ──────────────────────────────────────────
  if (!scheduledPassed && gameState === 'waiting') {
    const msLeft = config.scheduledTime - nowMs;
    const mins = Math.floor(msLeft / 60000);
    const secs = Math.floor((msLeft % 60000) / 1000);
    return (
      <div className="flex-1 w-full flex flex-col bg-[#FDFCF7]">
        <div className="p-6 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-10">
          <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-gray-900"><ArrowLeft className="w-6 h-6" /></button>
          <h2 className="font-bold text-gray-900">Scheduled Battle</h2>
          <div />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
            <Clock className="w-10 h-10 text-blue-700" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">{config.challenge}</h2>
          <p className="text-sm text-gray-500 mb-6">vs {opponentName}</p>
          <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-6 w-full max-w-xs">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Starts in</p>
            <div className="text-4xl font-black text-blue-700 tracking-widest">
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-6">Betting is open until battle starts</p>
        </div>
      </div>
    );
  }

  // ── Missed battle ───────────────────────────────────────────────────────────
  if (isLate) {
    return (
      <div className="flex-1 w-full flex flex-col bg-[#FDFCF7]">
        <div className="p-6 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-10">
          <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-gray-900"><ArrowLeft className="w-6 h-6" /></button>
          <h2 className="font-bold text-gray-900">Battle Expired</h2>
          <div />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">Battle window closed</h2>
          <p className="text-sm text-gray-500 mb-6">
            {config.challenge} vs {opponentName} — the 1-hour join window has passed.
          </p>
          <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-4 w-full max-w-xs">
            <p className="text-xs text-red-600 font-bold">No one joined in time. Battle expired.</p>
          </div>
          <button onClick={onBack} className="mt-8 font-bold text-blue-700 uppercase text-xs tracking-widest bg-white border-2 border-gray-200 px-6 py-3 rounded-xl shadow-sm active:scale-95 transition-all">
            Return to Arena
          </button>
        </div>
      </div>
    );
  }

  // ── Ready to join (live, waiting for user to press start) ───────────────────
  if (gameState === 'waiting') {
    return (
      <div className="flex-1 w-full flex flex-col bg-[#FDFCF7]">
        <div className="p-6 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-10">
          <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-gray-900"><ArrowLeft className="w-6 h-6" /></button>
          <div className="flex items-center space-x-2 bg-red-100 px-4 py-2 rounded-full border border-red-200">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-black text-red-600 tracking-widest">LIVE NOW</span>
          </div>
          <button onClick={() => setShowWithdrawConfirm(true)} className="text-gray-400 hover:text-red-500 text-xs font-bold uppercase">Quit</button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mb-6">
            <Zap className="w-10 h-10 text-yellow-500" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">{config.challenge}</h2>
          <p className="text-sm text-gray-500 mb-2">vs {opponentName}</p>
          <p className="text-xs text-gray-400 mb-8">Target: {targetReps} reps</p>
          <button
            onClick={() => setGameState('playing')}
            className="bg-blue-700 text-white text-lg font-black uppercase tracking-widest px-10 py-5 rounded-2xl shadow-[0_6px_0_#1e3a8a] active:shadow-none active:translate-y-[6px] transition-all"
          >
            I&apos;m Here! Start Battle
          </button>
          <p className="text-[10px] text-gray-400 mt-4">
            You have {Math.floor(Math.max(0, GRACE_PERIOD_SECONDS - secondsLate) / 60)}m {Math.max(0, GRACE_PERIOD_SECONDS - secondsLate) % 60}s to join
          </p>
        </div>
        {showWithdrawConfirm && <WithdrawModal opponentName={opponentName} onCancel={() => setShowWithdrawConfirm(false)} onConfirm={confirmWithdraw} />}
      </div>
    );
  }

  // ── Main battle UI ──────────────────────────────────────────────────────────
  return (
    <div className="flex-1 w-full flex flex-col bg-[#FDFCF7]">
      {/* Header */}
      <div className="p-6 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-10">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-gray-900"><ArrowLeft className="w-6 h-6" /></button>
        <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border ${timeLeft <= 10 ? 'bg-red-100 border-red-200' : 'bg-blue-50 border-blue-100'}`}>
          <Clock className={`w-4 h-4 ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-blue-700'}`} />
          <span className={`text-sm font-black tracking-widest ${timeLeft <= 10 ? 'text-red-600' : 'text-blue-700'}`}>{fmtTime(timeLeft)}</span>
        </div>
        <button
          onClick={() => setShowWithdrawConfirm(true)}
          className="bg-red-50 text-red-500 border-2 border-red-100 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider active:bg-red-100"
        >
          Withdraw
        </button>
      </div>

      <div className="flex-1 flex flex-col p-6 space-y-6">
        {/* Scoreboard */}
        <div className="grid grid-cols-2 gap-4 relative">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="bg-white p-2 rounded-full shadow-xl border-4 border-gray-50">
              <span className="text-xs font-black text-blue-700 italic px-1 uppercase">VS</span>
            </div>
          </div>
          {/* You */}
          <div className="bg-white border-2 border-gray-100 rounded-3xl p-5 flex flex-col items-center shadow-sm relative overflow-hidden">
            <div className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-300" style={{ width: `${Math.min(100, (userReps / targetReps) * 100)}%` }} />
            <img src={`https://ui-avatars.com/api/?name=${userName}&background=1D4ED8&color=fff`} className="w-16 h-16 rounded-full mb-3 border-4 border-gray-50 shadow-md" alt="You" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">YOU</span>
            <span className="text-4xl font-serif font-black text-blue-700">{userReps}</span>
            <span className="text-[10px] text-gray-400 mt-1">/ {targetReps}</span>
          </div>
          {/* Opponent */}
          <div className="bg-white border-2 border-gray-100 rounded-3xl p-5 flex flex-col items-center shadow-sm relative overflow-hidden">
            <div className="absolute bottom-0 left-0 h-1 bg-red-500 transition-all duration-300" style={{ width: `${Math.min(100, (opponentReps / targetReps) * 100)}%` }} />
            <img src={`https://ui-avatars.com/api/?name=${opponentName}&background=ef4444&color=fff`} className="w-16 h-16 rounded-full mb-3 border-4 border-gray-50 shadow-md" alt="Opponent" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{opponentName.toUpperCase()}</span>
            <span className="text-4xl font-serif font-black text-red-500">{opponentReps}</span>
            <span className="text-[10px] text-gray-400 mt-1">/ {targetReps}</span>
          </div>
        </div>

        {/* Playing */}
        {gameState === 'playing' && (
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-serif font-bold italic text-gray-900 mb-1">{config.challenge}</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em]">Tap for each rep — fastest wins!</p>
            </div>
            <button
              onClick={handleUserRep}
              className="w-48 h-48 mx-auto bg-green-600 text-white rounded-full flex flex-col items-center justify-center shadow-[0_12px_0_#14532d] active:shadow-none active:translate-y-[12px] transition-all outline-none"
            >
              <Zap className="w-10 h-10 mb-2 fill-current" />
              <span className="text-xl font-black tracking-widest uppercase">Rep Done</span>
            </button>
          </div>
        )}

        {/* Victory */}
        {gameState === 'victory' && (
          <div className="bg-green-50 border-2 border-green-100 rounded-[2.5rem] p-8 text-center shadow-xl">
            <div className="w-20 h-20 bg-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Trophy className="w-10 h-10" />
            </div>
            <h2 className="text-4xl font-serif font-bold text-green-700 mb-2">Victory!</h2>
            <p className="text-gray-600 font-medium mb-2">You dominated the Arena!</p>
            <div className="flex items-center justify-center space-x-1 text-yellow-600 mb-6">
              <Star className="w-5 h-5 fill-yellow-500" />
              <span className="font-bold text-lg">+10 Stars</span>
            </div>
            <div className="flex space-x-3">
              <button onClick={resetGame} className="flex-1 py-3.5 flex flex-col justify-center items-center text-[9px] font-bold text-green-700 uppercase tracking-widest border-2 border-green-100 bg-green-50 rounded-xl">
                <PlayCircle className="w-5 h-5 mb-1" /> Replay
              </button>
              <button onClick={() => alert('Shared!')} className="flex-1 py-3.5 flex flex-col justify-center items-center text-[9px] font-bold text-gray-600 uppercase tracking-widest border-2 border-gray-200 bg-gray-50 rounded-xl">
                <Share2 className="w-5 h-5 mb-1 text-gray-500" /> Share
              </button>
              <button onClick={resetGame} className="flex-1 py-3.5 flex flex-col justify-center items-center text-[9px] font-bold bg-blue-700 text-white uppercase tracking-widest rounded-xl shadow-[0_3px_0_#1e3a8a] active:shadow-none active:translate-y-[3px] transition-all">
                <Swords className="w-5 h-5 mb-1" /> Rematch
              </button>
            </div>
          </div>
        )}

        {/* Loss / Time Up */}
        {(gameState === 'loss' || gameState === 'timeUp') && (
          <div className="bg-red-50 border-2 border-red-100 rounded-[2.5rem] p-8 text-center shadow-xl">
            <div className="w-20 h-20 bg-red-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Frown className="w-10 h-10" />
            </div>
            <h2 className="text-4xl font-serif font-bold text-red-600 mb-2">
              {gameState === 'timeUp' ? "Time's Up!" : 'Defeated'}
            </h2>
            <p className="text-gray-600 font-medium mb-8">
              {gameState === 'timeUp'
                ? `You got ${userReps}/${targetReps} reps.`
                : `${opponentName} reached the finish line first.`}
            </p>
            <div className="flex space-x-3">
              <button onClick={resetGame} className="flex-1 py-3.5 flex flex-col justify-center items-center text-[9px] font-bold text-gray-400 uppercase tracking-widest border-2 border-gray-200 bg-gray-50 rounded-xl">
                <PlayCircle className="w-5 h-5 mb-1" /> Replay
              </button>
              <button onClick={() => alert('Shared!')} className="flex-1 py-3.5 flex flex-col justify-center items-center text-[9px] font-bold text-gray-600 uppercase tracking-widest border-2 border-gray-200 bg-gray-50 rounded-xl">
                <Share2 className="w-5 h-5 mb-1 text-gray-500" /> Share
              </button>
              <button onClick={resetGame} className="flex-1 py-3.5 flex flex-col justify-center items-center text-[9px] font-bold bg-blue-700 text-white uppercase tracking-widest rounded-xl shadow-[0_3px_0_#1e3a8a] active:shadow-none active:translate-y-[3px] transition-all">
                <Swords className="w-5 h-5 mb-1" /> Rematch
              </button>
            </div>
          </div>
        )}
      </div>

      {showWithdrawConfirm && (
        <WithdrawModal opponentName={opponentName} onCancel={() => setShowWithdrawConfirm(false)} onConfirm={confirmWithdraw} />
      )}
    </div>
  );
}

function WithdrawModal({ opponentName, onCancel, onConfirm }: { opponentName: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 relative z-10 shadow-2xl">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>
        <h3 className="text-xl font-serif font-bold text-gray-900 mb-2 text-center">Withdraw?</h3>
        <p className="text-sm text-gray-500 mb-6 text-center leading-relaxed">
          You will forfeit this battle. <strong>{opponentName}</strong> will be declared the winner.
        </p>
        <div className="flex space-x-3">
          <button onClick={onCancel} className="flex-1 py-3.5 bg-gray-50 text-gray-600 font-bold text-xs uppercase tracking-wider rounded-xl border border-gray-200">
            Keep Fighting
          </button>
          <button onClick={onConfirm} className="flex-1 py-3.5 bg-red-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-[0_4px_0_#b91c1c] active:shadow-none active:translate-y-[4px] transition-all">
            Withdraw
          </button>
        </div>
      </div>
    </div>
  );
}
