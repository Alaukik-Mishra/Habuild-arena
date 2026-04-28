// app/page.tsx
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Login from '@/components/Login';
import CommunityFeed from '@/components/CommunityFeed';
import HomeDashboard from '@/components/HomeDashboard';
import Arena from '@/components/Arena';
import Battle from '@/components/Battle';
import Profile from '@/components/Profile';
import Leaderboard from '@/components/Leaderboard';
import LiveBattlePage from '../components/LiveBattlePage';
import ReferralPage from '../components/ReferralPage';
import BottomNav from '@/components/BottomNav';
import { UserProfile, AppScreen, LiveBattle, BetRecord, Invite, FriendRequest, ChatThread } from '@/types';
import { BattleFilter } from '@/lib/filters';
import { resolveBet, BET_AMOUNT } from '@/lib/betLogic';
import { updateStats } from '@/lib/statsLogic';
import {
  getBattles, createBattle, updateBattle,
  getInvites, createInvite,
  getFriendRequests, createFriendRequest, updateFriendRequestStatus,
  getChatThreads, createChatThread, sendChatMessage,
  getAllUsers, updateProfile,
} from '@/lib/db';

const _now = Date.now();

const DUMMY_USERS = ['Alex','Jordan','Leo','Sam','Priya','Kunal','Arjun','Rahul','Vikram','Neha','Rohan','Aisha','Dev','Meera','Kabir'];
const DUMMY_CHALLENGES = ['50 Squats','2 Min Plank','100 Pushups','1 Min Burpees','100 Jumping Jacks','30 Second Sprint','20 Pull-ups','5 Min Run','3 Min Wall Sit','75 Lunges'];
const TARGETS = [50,120,100,60,100,1,20,1,1,75];

function generateDummyBattles(): LiveBattle[] {
  const battles: LiveBattle[] = [];
  for (let i = 0; i < 2; i++) {
    const u1 = DUMMY_USERS[i % DUMMY_USERS.length];
    const u2 = DUMMY_USERS[(i + 3) % DUMMY_USERS.length];
    const challenge = DUMMY_CHALLENGES[i % DUMMY_CHALLENGES.length];
    const target = TARGETS[i % TARGETS.length];
    const p1Reps = Math.floor(Math.random() * target * 0.8);
    const p2Reps = Math.floor(Math.random() * target * 0.7);
    const isLive = i < 5;
    const isCompleted = i >= 10;
    const winner = isCompleted ? (p1Reps >= target ? u1 : p2Reps >= target ? u2 : Math.random() > 0.5 ? u1 : u2) : undefined;
    battles.push({
      id: `db${i}`,
      p1: { name: u1, wins: Math.floor(Math.random()*50), streak: Math.floor(Math.random()*10) },
      p2: { name: u2, wins: Math.floor(Math.random()*50), streak: Math.floor(Math.random()*10) },
      challenge,
      pool: Math.floor(Math.random()*500+100),
      p1Reps,
      p2Reps,
      target,
      timeLeft: isLive ? `0${Math.floor(Math.random()*5)}:${Math.floor(Math.random()*60).toString().padStart(2,'0')}` : '00:00',
      comments: i % 3 === 0 ? [{ id: `dc${i}`, user: DUMMY_USERS[(i+5)%DUMMY_USERS.length], text: `${u1} is crushing it!` }] : [],
      reactions: {
        fire: Array.from({ length: Math.floor(Math.random()*15) }, (_, j) => `User${j}`),
        crown: Array.from({ length: Math.floor(Math.random()*8) }, (_, j) => `Viewer${j}`),
      },
      status: isLive ? 'live' : isCompleted ? 'completed' : 'upcoming',
      isPublic: true,
      bettingOpen: !isCompleted,
      scheduledTime: isLive ? _now - Math.random()*600000 : isCompleted ? _now - 7200000 : _now + (i-4)*1800000,
      winner,
    });
  }
  return battles;
}

const INITIAL_BATTLES = generateDummyBattles();

const INITIAL_INVITES: Invite[] = [
  { id: 'i1', from: 'Kunal', to: 'You', challenge: '1 Min Plank', scheduledTime: _now + 7200000, status: 'pending', isPublic: false, timestamp: _now - 120000 },
];

const INITIAL_FRIEND_REQUESTS: FriendRequest[] = [
  { id: 'f1', from: 'Priya', to: 'You', status: 'pending', timestamp: _now - 3600000 },
  { id: 'f2', from: 'You', to: 'Rahul', status: 'pending', timestamp: _now - 7200000 },
];

const INITIAL_CHAT_THREADS: ChatThread[] = [
  {
    id: 't1',
    participants: ['You', 'Arjun'],
    messages: [
      { id: 'm1', sender: 'Arjun', text: 'You ready for tomorrow?', timestamp: _now - 3600000 },
      { id: 'm2', sender: 'You', text: 'Always ready!', timestamp: _now - 3500000 },
      { id: 'm3', sender: 'Arjun', text: 'Let\'s go 💪 I\'m doing 100 pushups', timestamp: _now - 3400000 },
    ],
  },
  {
    id: 't2',
    participants: ['You', 'Priya'],
    messages: [
      { id: 'm4', sender: 'Priya', text: 'GG nice pushups!', timestamp: _now - 10800000 },
      { id: 'm5', sender: 'You', text: 'Thanks! You were close too', timestamp: _now - 10700000 },
      { id: 'm6', sender: 'Priya', text: 'Rematch tomorrow? 🔥', timestamp: _now - 10600000 },
      { id: 'm7', sender: 'You', text: 'You\'re on!', timestamp: _now - 10500000 },
    ],
  },
  {
    id: 't3',
    participants: ['You', 'Kunal'],
    messages: [
      { id: 'm8', sender: 'Kunal', text: 'Bro I challenged you to a plank battle', timestamp: _now - 7200000 },
      { id: 'm9', sender: 'You', text: 'Saw it, accepting now', timestamp: _now - 7100000 },
      { id: 'm10', sender: 'Kunal', text: 'Don\'t chicken out 😂', timestamp: _now - 7000000 },
    ],
  },
  {
    id: 't4',
    participants: ['You', 'Rahul'],
    messages: [
      { id: 'm11', sender: 'Rahul', text: 'How many squats did you do today?', timestamp: _now - 86400000 },
      { id: 'm12', sender: 'You', text: '150! New PR 🎉', timestamp: _now - 86300000 },
      { id: 'm13', sender: 'Rahul', text: 'Beast mode activated', timestamp: _now - 86200000 },
    ],
  },
  {
    id: 't5',
    participants: ['You', 'Neha'],
    messages: [
      { id: 'm14', sender: 'Neha', text: 'Hey! Want to join our group challenge?', timestamp: _now - 172800000 },
      { id: 'm15', sender: 'You', text: 'What\'s the challenge?', timestamp: _now - 172700000 },
      { id: 'm16', sender: 'Neha', text: '30 day plank streak 🏆', timestamp: _now - 172600000 },
    ],
  },
];

const DEFAULT_ALL_USERS = ['Alex', 'Jordan', 'Leo', 'Sam', 'Priya', 'Kunal', 'Arjun', 'Rahul'];
const CHALLENGES = ['10 Pushups', '50 Squats', '2 Min Plank', '1 Min Burpees', '100 Jumping Jacks', '30 Second Sprint'];

type ShellProps = {
  children: React.ReactNode;
  hideNav?: boolean;
  currentScreen?: AppScreen;
  onNavigate?: (screen: AppScreen) => void;
};

function AppShell({ children, hideNav = false, currentScreen, onNavigate }: ShellProps) {
  return (
    <div className="min-h-screen bg-[#E5E7EB] flex items-center justify-center p-4">
      <div className="w-full max-w-[412px] h-[844px] bg-[#FDFCF7] flex flex-col relative overflow-hidden">
        <main className="flex-1 flex flex-col min-h-0 relative">
          {children}
        </main>
        {!hideNav && currentScreen && onNavigate && (
          <BottomNav current={currentScreen} onNavigate={onNavigate} />
        )}
      </div>
    </div>
  );
}

export default function HabuildArena() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('dashboard');
  const [points, setPoints] = useState(1000);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [battles, setBattles] = useState<LiveBattle[]>(INITIAL_BATTLES);
  const [bets, setBets] = useState<Record<string, string>>({});
  const [betHistory, setBetHistory] = useState<BetRecord[]>([]);
  const [invites, setInvites] = useState<Invite[]>(INITIAL_INVITES);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(INITIAL_FRIEND_REQUESTS);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>(INITIAL_CHAT_THREADS);
  const [friends, setFriends] = useState<string[]>(['Arjun', 'Priya']);
  const [allUsers, setAllUsers] = useState<string[]>(DEFAULT_ALL_USERS);
  const [activeBattleConfig, setActiveBattleConfig] = useState<{ opponent: string; challenge: string; target: number; scheduledTime: number } | null>(null);
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
  const [selectedBattleId, setSelectedBattleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [battleFilter, setBattleFilter] = useState<BattleFilter>('all');
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(false);

  // ─── Restore session from localStorage ──────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem('arena_user');
      if (saved) {
        const parsed: UserProfile = JSON.parse(saved);
        setUser(parsed);
        setPoints(parsed.points);
      }
    } catch {
      // ignore corrupt data
    } finally {
      setSessionLoading(false);
    }
  }, []);

  // Persist user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('arena_user', JSON.stringify({ ...user, points }));
    }
  }, [user, points]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) return;
    const userName = user.name;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [b, i, f, c, u] = await Promise.all([
          getBattles(),
          getInvites(userName),
          getFriendRequests(userName),
          getChatThreads(userName),
          getAllUsers().catch(() => DEFAULT_ALL_USERS),
        ]);
        if (!cancelled) {
          setBattles(prev => b.length > 0 ? b : prev);
          setInvites(prev => i.length > 0 ? i : prev);
          setFriendRequests(prev => f.length > 0 ? f : prev);
          setChatThreads(prev => c.length > 0 ? c : prev);
          setAllUsers(u.length > 0 ? u.filter((n: string) => n !== userName) : DEFAULT_ALL_USERS);
          setFriends(prev => {
            const accepted = f.filter((r: FriendRequest) => r.status === 'accepted');
            const newFriends = accepted.flatMap((r: FriendRequest) => [r.from, r.to]).filter((n: string) => n !== userName);
            return Array.from(new Set([...prev, ...newFriends]));
          });
        }
      } catch (e) {
        console.error('Supabase load error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  const resolveBattle = useCallback(async (battleId: string) => {
    setBattles(prev => prev.map(b => {
      if (b.id !== battleId || b.winner) return b;
      const winner = b.p1Reps >= b.target ? b.p1.name : b.p2Reps >= b.target ? b.p2.name : Math.random() > 0.5 ? b.p1.name : b.p2.name;
      const myBet = bets[battleId];
      if (myBet && user) {
        const won = myBet === winner;
        const battleName = `${b.p1.name} vs ${b.p2.name} — ${b.challenge}`;
        setBetHistory(prev => [...prev, {
          id: 'bet-' + Date.now(),
          battleId: b.id,
          battleName,
          challenge: b.challenge,
          playerBetOn: myBet,
          opponent: myBet === b.p1.name ? b.p2.name : b.p1.name,
          amount: BET_AMOUNT,
          winner,
          status: won ? 'won' : 'lost',
          timestamp: Date.now(),
        }]);
        setPoints(p => resolveBet(p, won));
      }
      return { ...b, winner, status: 'completed' as const, bettingOpen: false };
    }));
    // Update stats if user was a participant
    if (user) {
      const battle = battles.find(b => b.id === battleId);
      if (battle && (battle.p1.name === user.name || battle.p2.name === user.name)) {
        const winner = battle.p1Reps >= battle.target ? battle.p1.name : battle.p2Reps >= battle.target ? battle.p2.name : battle.p1.name;
        const outcome = winner === user.name ? 'win' : 'loss';
        const stats = updateStats(user, outcome);
        setUser(prev => prev ? { ...prev, ...stats } : prev);
        try { await updateProfile(user.phone, stats); } catch (e) { console.error(e); }
      }
    }
    try {
      await updateBattle(battleId, { winner: '', status: 'completed', bettingOpen: false });
    } catch (e) { console.error(e); }
  }, [battles, bets, user]);

  const handleWithdraw = useCallback(async (battleId: string, withdrawingUser: string) => {
    const battle = battles.find(b => b.id === battleId);
    if (!battle) return;
    const winner = battle.p1.name === withdrawingUser ? battle.p2.name : battle.p1.name;
    const myBet = bets[battleId];
    if (myBet) {
      const won = myBet === winner;
      setBetHistory(prev => [...prev, {
        id: 'bet-' + Date.now(),
        battleId: battle.id,
        battleName: `${battle.p1.name} vs ${battle.p2.name} — ${battle.challenge}`,
        challenge: battle.challenge,
        playerBetOn: myBet,
        opponent: myBet === battle.p1.name ? battle.p2.name : battle.p1.name,
        amount: BET_AMOUNT,
        winner,
        status: won ? 'won' : 'lost',
        timestamp: Date.now(),
      }]);
      setPoints(p => resolveBet(p, won));
    }
    setBattles(prev => prev.map(b => b.id === battleId ? { ...b, winner, status: 'forfeited' as const, bettingOpen: false } : b));
    // Update stats for withdrawing user
    if (user && withdrawingUser === user.name) {
      const stats = updateStats(user, 'forfeit');
      setUser(prev => prev ? { ...prev, ...stats } : prev);
      try { await updateProfile(user.phone, stats); } catch (e) { console.error(e); }
    }
    try { await updateBattle(battleId, { winner, status: 'forfeited', bettingOpen: false }); } catch (e) { console.error(e); }
    setActiveBattleId(null);
    setCurrentScreen('arena');
  }, [battles, bets, user]);

  const handleLogout = () => {
    localStorage.removeItem('arena_user');
    setUser(null);
    setPoints(1000);
    setBattles(INITIAL_BATTLES);
    setBets({});
    setBetHistory([]);
    setInvites(INITIAL_INVITES);
    setFriendRequests(INITIAL_FRIEND_REQUESTS);
    setChatThreads(INITIAL_CHAT_THREADS);
    setFriends(['Arjun', 'Priya']);
    setAllUsers(DEFAULT_ALL_USERS);
    setActiveBattleConfig(null);
    setActiveBattleId(null);
    setSelectedBattleId(null);
    setSearchQuery('');
    setBattleFilter('all');
    setCurrentScreen('dashboard');
  };

  if (sessionLoading) {
    return (
      <AppShell hideNav>
        <div className="flex-1 flex items-center justify-center text-gray-400 font-bold text-xs uppercase tracking-widest">Loading Arena...</div>
      </AppShell>
    );
  }

  if (loading && !user) {
    return (
      <AppShell hideNav>
        <div className="flex-1 flex items-center justify-center text-gray-400 font-bold text-xs uppercase tracking-widest">Loading Arena...</div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell hideNav>
        <Login onLogin={(u) => { setUser(u); setPoints(u.points); }} />
      </AppShell>
    );
  }

  if (currentScreen === 'battle') {
    return (
      <AppShell hideNav>
        <Battle
          onBack={() => setCurrentScreen('arena')}
          config={activeBattleConfig || { opponent: 'Rahul', challenge: '10 Pushups', target: 10, scheduledTime: now - 300000 }}
          userName={user.name}
          onWithdraw={handleWithdraw}
          activeBattleId={activeBattleId || ''}
          onBattleEnd={resolveBattle}
        />
      </AppShell>
    );
  }

  if (currentScreen === 'live') {
    const selectedBattle = battles.find(b => b.id === selectedBattleId);
    return (
      <AppShell hideNav>
        <LiveBattlePage
          battle={selectedBattle || null}
          user={user}
          bets={bets}
          setBets={setBets}
          points={points}
          setPoints={setPoints}
          setBattles={setBattles}
          betHistory={betHistory}
          setBetHistory={setBetHistory}
          now={now}
          onBack={() => setCurrentScreen('dashboard')}
          onJoinBattle={(battle: LiveBattle) => {
            setActiveBattleId(battle.id);
            setActiveBattleConfig({
              opponent: battle.p1.name === user.name ? battle.p2.name : battle.p1.name,
              challenge: battle.challenge,
              target: battle.target,
              scheduledTime: battle.scheduledTime || now,
            });
            setCurrentScreen('battle');
          }}
        />
      </AppShell>
    );
  }

  if (currentScreen === 'referral') {
    return (
      <AppShell currentScreen={currentScreen} onNavigate={setCurrentScreen}>
        <ReferralPage user={user} setPoints={setPoints} />
      </AppShell>
    );
  }

  return (
    <AppShell currentScreen={currentScreen} onNavigate={setCurrentScreen}>
      {currentScreen === 'dashboard' && (
        <HomeDashboard
          user={user}
          points={points}
          battles={battles}
          bets={bets}
          setBets={setBets}
          now={now}
          setPoints={setPoints}
          setBattles={setBattles}
          activeBattleId={activeBattleId}
          setActiveBattleId={setActiveBattleId}
          setActiveBattleConfig={setActiveBattleConfig}
          setCurrentScreen={setCurrentScreen}
          setSelectedBattleId={setSelectedBattleId}
        />
      )}
      {currentScreen === 'community' && (
        <CommunityFeed user={user} points={points} />
      )}
      {currentScreen === 'arena' && (
        <Arena
          setScreen={setCurrentScreen}
          setActiveBattleConfig={setActiveBattleConfig}
          setActiveBattleId={setActiveBattleId}
          invites={invites}
          setInvites={setInvites}
          friendRequests={friendRequests}
          setFriendRequests={setFriendRequests}
          chatThreads={chatThreads}
          setChatThreads={setChatThreads}
          friends={friends}
          allUsers={allUsers}
          challenges={CHALLENGES}
          userName={user.name}
          onSendFriendRequest={async (name: string) => {
            if (friends.includes(name)) return;
            const req: FriendRequest = { id: crypto.randomUUID(), from: user.name, to: name, status: 'pending', timestamp: Date.now() };
            setFriendRequests(prev => [...prev, req]);
            try { await createFriendRequest(req); } catch (e) { console.error(e); }
          }}
          onAcceptFriendRequest={async (id: string) => {
            const req = friendRequests.find(r => r.id === id);
            if (!req) return;
            setFriendRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'accepted' as const } : r));
            const newFriend = req.from === user.name ? req.to : req.from;
            if (!friends.includes(newFriend) && newFriend !== user.name) setFriends(prev => [...prev, newFriend]);
            try { await updateFriendRequestStatus(id, 'accepted'); } catch (e) { console.error(e); }
          }}
          onRejectFriendRequest={async (id: string) => {
            setFriendRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' as const } : r));
            try { await updateFriendRequestStatus(id, 'rejected'); } catch (e) { console.error(e); }
          }}
          onCreateInvite={async (invite: Invite) => {
            setInvites(prev => [...prev, invite]);
            const newBattle: Omit<LiveBattle, 'id'> & { id: string } = {
              id: invite.id,
              p1: { name: invite.from, wins: user.wins, streak: user.streak },
              p2: { name: invite.to, wins: 0, streak: 0 },
              challenge: invite.challenge,
              pool: 0,
              p1Reps: 0,
              p2Reps: 0,
              target: 10,
              timeLeft: '00:00',
              comments: [],
              reactions: {},
              status: 'upcoming',
              isPublic: invite.isPublic,
              bettingOpen: true,
              scheduledTime: invite.scheduledTime,
            };
            setBattles(prev => [newBattle, ...prev]);
            try { await createInvite(invite); } catch (e) { console.error(e); }
            try { await createBattle(newBattle); } catch (e) { console.error(e); }
          }}
          onSendMessage={async (threadId: string, sender: string, text: string, timestamp: number) => {
            try { await sendChatMessage(threadId, sender, text, timestamp); } catch (e) { console.error(e); }
          }}
          onCreateChatThread={async (participants: string[]) => {
            try { return await createChatThread(participants); } catch (e) { console.error(e); return crypto.randomUUID(); }
          }}
          user={user}
          points={points}
          setPoints={setPoints}
          battles={battles}
          setBattles={setBattles}
          bets={bets}
          setBets={setBets}
          now={now}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          battleFilter={battleFilter}
          setBattleFilter={setBattleFilter}
          activeBattleId={activeBattleId}
          setBattlesActiveBattleId={setActiveBattleId}
          setCurrentScreen={setCurrentScreen}
          selectedBattleId={selectedBattleId}
          setSelectedBattleId={setSelectedBattleId}
        />
      )}
      {currentScreen === 'profile' && (
        <Profile user={user} betHistory={betHistory} points={points} onLogout={handleLogout} />
      )}
      {currentScreen === 'leaderboard' && (
        <Leaderboard userName={user.name} />
      )}
    </AppShell>
  );
}
