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
import NotificationsSection from '@/components/NotificationsSection';
import BattleRequestScreen from '@/components/BattleRequestScreen';
import NotificationCenter from '@/components/NotificationCenter';
import { NotificationContextProvider, useNotifications } from '@/lib/NotificationContext';
import { UserProfile, AppScreen, LiveBattle, BetRecord, Invite, FriendRequest, ChatThread, BattleInvite } from '@/types';
import { BattleFilter } from '@/lib/filters';
import { resolveBet, BET_AMOUNT } from '@/lib/betLogic';
import { updateStats } from '@/lib/statsLogic';
import {
  getBattles, updateBattle,
  getInviteById, getBattleStateForUser, subscribeToBattleState,
  getFriendRequests, createFriendRequest, updateFriendRequestStatus,
  getChatThreads, createChatThread, sendChatMessage,
  getAllUsers, updateProfile,
  acceptBattleRequest, rejectBattleRequest,
} from '@/lib/db';
import type { BattleStateSnapshot } from '@/lib/db';

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
    const p1Reps = Math.floor(Math.random() * target * 0.5);
    const p2Reps = Math.floor(Math.random() * target * 0.4);
    battles.push({
      id: `db${i}`,
      p1: { name: u1, wins: Math.floor(Math.random()*50), streak: Math.floor(Math.random()*10) },
      p2: { name: u2, wins: Math.floor(Math.random()*50), streak: Math.floor(Math.random()*10) },
      challenge,
      pool: Math.floor(Math.random()*500+100),
      p1Reps,
      p2Reps,
      target,
      timeLeft: `0${Math.floor(Math.random()*5)}:${Math.floor(Math.random()*60).toString().padStart(2,'0')}`,
      comments: [],
      reactions: {},
      status: 'live',
      isPublic: true,
      bettingOpen: true,
      scheduledTime: _now - Math.random()*600000,
    });
  }
  return battles;
}

const INITIAL_BATTLES = generateDummyBattles();
const INITIAL_INVITES: Invite[] = [];
const INITIAL_FRIEND_REQUESTS: FriendRequest[] = [];
const INITIAL_CHAT_THREADS: ChatThread[] = [];
const DEFAULT_ALL_USERS = ['Alex', 'Jordan', 'Leo', 'Sam', 'Priya', 'Kunal', 'Arjun', 'Rahul'];
const CHALLENGES = ['10 Pushups', '50 Squats', '2 Min Plank', '1 Min Burpees', '100 Jumping Jacks', '30 Second Sprint'];

type ShellProps = {
  children: React.ReactNode;
  hideNav?: boolean;
  currentScreen?: AppScreen;
  onNavigate?: (screen: AppScreen) => void;
  unreadNotificationCount?: number;
  onNotificationsClick?: () => void;
  notificationCenterProps?: {
    onAccept: (inviteId: string, notificationId: string) => Promise<void>;
    onReject: (inviteId: string, notificationId: string) => Promise<void>;
  };
};

function AppShell({
  children,
  hideNav = false,
  currentScreen,
  onNavigate,
  unreadNotificationCount,
  onNotificationsClick,
  notificationCenterProps,
}: ShellProps) {
  return (
    <div className="min-h-screen bg-[#E5E7EB] md:flex md:items-center md:justify-center md:p-4">
      <div className="w-full md:max-w-[412px] h-[100dvh] md:h-[844px] bg-[#FDFCF7] flex flex-col relative overflow-hidden md:rounded-[2rem] md:shadow-2xl">
        {/* Global header with NotificationCenter bell — visible on all non-fullscreen screens */}
        {!hideNav && notificationCenterProps && (
          <div className="shrink-0 flex items-center justify-end px-4 pt-3 pb-1 bg-[#FDFCF7] border-b border-gray-100 z-30">
            <NotificationCenter
              onAccept={notificationCenterProps.onAccept}
              onReject={notificationCenterProps.onReject}
            />
          </div>
        )}
        <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
          {children}
        </main>
        {!hideNav && currentScreen && onNavigate && (
          <BottomNav
            current={currentScreen}
            onNavigate={onNavigate}
            unreadNotificationCount={unreadNotificationCount}
            onNotificationsClick={onNotificationsClick}
          />
        )}
      </div>
    </div>
  );
}

// Root component — owns session state and wraps everything in NotificationContextProvider
export default function HabuildArena() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('arena_user');
      if (saved) {
        const parsed = JSON.parse(saved) as UserProfile;
        setUser(parsed);
      }
    } catch { /* ignore */ }
    setSessionLoading(false);
  }, []);

  if (sessionLoading) {
    return (
      <AppShell hideNav>
        <div className="flex-1 flex items-center justify-center text-gray-400 font-bold text-xs uppercase tracking-widest">
          Loading Arena...
        </div>
      </AppShell>
    );
  }

  return (
    // NotificationContextProvider is mounted here so it wraps the entire app.
    // It owns the polling interval and Realtime subscription — no polling in page.tsx.
    <NotificationContextProvider userId={user?.name ?? null}>
      <ArenaApp user={user} setUser={setUser} />
    </NotificationContextProvider>
  );
}

// Inner app — consumes NotificationContext via useNotifications()
function ArenaApp({
  user,
  setUser,
}: {
  user: UserProfile | null;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}) {
  const { notifications, unreadCount, setNotifications, markRead } = useNotifications();

  const [currentScreen, setCurrentScreen] = useState<AppScreen>('dashboard');
  const [points, setPoints] = useState(1000);
  const [battles, setBattles] = useState<LiveBattle[]>(INITIAL_BATTLES);
  const [bets, setBets] = useState<Record<string, string>>({});
  const [betHistory, setBetHistory] = useState<BetRecord[]>([]);
  const [invites, setInvites] = useState<Invite[]>(INITIAL_INVITES);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(INITIAL_FRIEND_REQUESTS);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>(INITIAL_CHAT_THREADS);
  const [friends, setFriends] = useState<string[]>(['Arjun', 'Priya']);
  const [allUsers, setAllUsers] = useState<string[]>(DEFAULT_ALL_USERS);
  const [activeBattleConfig, setActiveBattleConfig] = useState<{
    opponent: string; challenge: string; target: number; scheduledTime: number;
  } | null>(null);
  const [activeBattleId, setActiveBattleId] = useState<string | null>(null);
  const [selectedBattleId, setSelectedBattleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [battleFilter, setBattleFilter] = useState<BattleFilter>('all');
  const [now, setNow] = useState(_now);
  const [loading, setLoading] = useState(false);

  // activeInviteId: which invite is shown in BattleRequestScreen / WaitingPage
  // activeNotificationId: the notification UUID — passed to accept/reject for atomic cleanup
  const [activeInviteId, setActiveInviteId] = useState<string | null>(null);
  const [activeNotificationId, setActiveNotificationId] = useState<string | null>(null);
  const [battleStateSnapshots, setBattleStateSnapshots] = useState<BattleStateSnapshot[]>([]);

  const applyBattleStateSnapshots = useCallback((snapshots: BattleStateSnapshot[]) => {
    setBattleStateSnapshots(snapshots);
    const nowTs = Date.now();
    const mappedInvites: Invite[] = snapshots.map((snapshot) => ({
      id: snapshot.inviteId,
      from: snapshot.challengerId,
      to: snapshot.opponentId,
      challenge: snapshot.challenge,
      scheduledTime: snapshot.scheduledTime,
      status: snapshot.uiState === 'pending' ? 'pending' : snapshot.uiState === 'rejected' ? 'rejected' : 'accepted',
      battleStatus: snapshot.inviteStatus,
      isPublic: snapshot.isPublic,
      timestamp: nowTs,
    }));
    setInvites(mappedInvites);

    setBattles((prev) => {
      const byInviteId = new Map(snapshots.map((s) => [s.inviteId, s]));
      const updated = prev.map((battle) => {
        const snap = byInviteId.get(battle.id);
        if (!snap) return battle;
        const nextStatus =
          snap.battleStatus?.toLowerCase() === 'live'
            ? 'live'
            : snap.battleStatus?.toLowerCase() === 'active'
              ? 'active'
              : snap.battleStatus?.toLowerCase() === 'pending'
                ? 'pending'
                : battle.status;
        return { ...battle, status: nextStatus as LiveBattle['status'] };
      });

      const existingIds = new Set(updated.map((battle) => battle.id));
      const append = snapshots
        .filter((snap) => snap.battleId && !existingIds.has(snap.inviteId))
        .map((snap): LiveBattle => ({
          id: snap.inviteId,
          p1: { name: snap.challengerId, wins: 0, streak: 0 },
          p2: { name: snap.opponentId, wins: 0, streak: 0 },
          challenge: snap.challenge,
          pool: 0,
          p1Reps: 0,
          p2Reps: 0,
          target: 0,
          timeLeft: '60:00',
          comments: [],
          reactions: {},
          status: (snap.battleStatus?.toLowerCase() === 'active' ? 'active' : snap.battleStatus?.toLowerCase() === 'pending' ? 'pending' : 'live') as LiveBattle['status'],
          isPublic: snap.isPublic,
          bettingOpen: false,
          scheduledTime: snap.scheduledTime,
        }));

      return append.length > 0 ? [...updated, ...append] : updated;
    });
  }, []);

  useEffect(() => {
    if (!user || battleStateSnapshots.length === 0) return;
    const mine = battleStateSnapshots.find((snapshot) =>
      (snapshot.challengerId === user.name || snapshot.opponentId === user.name) &&
      (snapshot.battleStatus?.toLowerCase() === 'active' || snapshot.battleStatus?.toLowerCase() === 'live')
    );
    if (!mine) return;
    if (currentScreen === 'battle' && activeBattleId === mine.inviteId) return;

    setActiveBattleId(mine.inviteId);
    setActiveBattleConfig({
      opponent: mine.challengerId === user.name ? mine.opponentId : mine.challengerId,
      challenge: mine.challenge,
      target: 10,
      scheduledTime: Date.now(),
    });
    setCurrentScreen('battle');
  }, [battleStateSnapshots, user, currentScreen, activeBattleId]);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('arena_user', JSON.stringify({ ...user, points }));
    }
  }, [user, points]);

  // Initial data load (battles, invites, friends, chat) — notifications are handled by context
  useEffect(() => {
    if (!user) return;
    const userName = user.name;
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [b, f, c, u] = await Promise.all([
          getBattles(),
          getFriendRequests(userName),
          getChatThreads(userName),
          getAllUsers().catch(() => DEFAULT_ALL_USERS),
        ]);
        if (!cancelled) {
          setBattles(prev => b.length > 0 ? b : prev);
          setFriendRequests(prev => f.length > 0 ? f : prev);
          setChatThreads(prev => c.length > 0 ? c : prev);
          setAllUsers(u.length > 0 ? [...new Set(u.filter((n: string) => n !== userName))] : DEFAULT_ALL_USERS);
          setFriends(prev => {
            const accepted = f.filter((r: FriendRequest) => r.status === 'accepted');
            const newFriends = accepted
              .flatMap((r: FriendRequest) => [r.from, r.to])
              .filter((n: string) => n !== userName);
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

  // Centralized bidirectional battle state machine.
  // One realtime channel listens to both invites and battles, then re-snapshots
  // all rows where the current user is challenger or opponent.
  useEffect(() => {
    if (!user) return;
    let disposed = false;

    getBattleStateForUser(user.name)
      .then((snapshots) => {
        if (!disposed) applyBattleStateSnapshots(snapshots);
      })
      .catch((e) => console.error('[battle-state] initial sync error:', e));

    const unsubscribe = subscribeToBattleState(user.name, (snapshots) => {
      if (!disposed) applyBattleStateSnapshots(snapshots);
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [user, applyBattleStateSnapshots]);

  // ── Inline accept/reject from the NotificationCenter dropdown ──────────────
  // These pass the notification UUID so the DB marks it read atomically.
  const handleInlineAccept = useCallback(async (inviteId: string, notificationId: string) => {
    const result = await acceptBattleRequest(inviteId, notificationId);
    if (result && 'error' in result) {
      if (result.error === 'INVITE_NOT_PENDING') throw new Error('This request is no longer available');
      throw new Error('Something went wrong');
    }
    await markRead(notificationId);
    setActiveInviteId(inviteId);
    setActiveNotificationId(notificationId);
    const snapshot = battleStateSnapshots.find((s) => s.inviteId === inviteId);
    const invite = invites.find((i) => i.id === inviteId);
    const challenger = snapshot?.challengerId || invite?.from;
    const opponent = snapshot?.opponentId || invite?.to;
    const challenge = snapshot?.challenge || invite?.challenge || '10 Pushups';
    setActiveBattleId(inviteId);
    setActiveBattleConfig({
      opponent: challenger === user?.name ? (opponent || 'Opponent') : (challenger || 'Opponent'),
      challenge,
      target: 10,
      scheduledTime: Date.now(),
    });
    setCurrentScreen('battle' as AppScreen);
  }, [markRead, battleStateSnapshots, invites, user]);

  const handleInlineReject = useCallback(async (inviteId: string, notificationId: string) => {
    const result = await rejectBattleRequest(inviteId, notificationId);
    if (result && 'error' in result) {
      if (result.error === 'INVITE_NOT_PENDING') throw new Error('This request is no longer available');
      throw new Error('Something went wrong');
    }
    await markRead(notificationId);
    // Remove from context state immediately so it doesn't reappear on next poll
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, [markRead, setNotifications]);

  // ── Battle resolution ──────────────────────────────────────────────────────
  const resolveBattle = useCallback(async (battleId: string) => {
    setBattles(prev => prev.map(b => {
      if (b.id !== battleId || b.winner) return b;
      const winner = b.p1Reps >= b.target
        ? b.p1.name
        : b.p2Reps >= b.target
          ? b.p2.name
          : Math.random() > 0.5 ? b.p1.name : b.p2.name;
      const myBet = bets[battleId];
      if (myBet && user) {
        const won = myBet === winner;
        setBetHistory(prev => [...prev, {
          id: 'bet-' + Date.now(),
          battleId: b.id,
          battleName: `${b.p1.name} vs ${b.p2.name} — ${b.challenge}`,
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
    if (user) {
      const battle = battles.find(b => b.id === battleId);
      if (battle && (battle.p1.name === user.name || battle.p2.name === user.name)) {
        const winner = battle.p1Reps >= battle.target
          ? battle.p1.name
          : battle.p2Reps >= battle.target ? battle.p2.name : battle.p1.name;
        const outcome = winner === user.name ? 'win' : 'loss';
        const stats = updateStats(user, outcome);
        setUser(prev => prev ? { ...prev, ...stats } : prev);
        try { await updateProfile(user.phone, stats); } catch (e) { console.error(e); }
      }
    }
    try {
      await updateBattle(battleId, {
        winner: battles.find(b => b.id === battleId)?.winner || '',
        status: 'completed',
        bettingOpen: false,
      });
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
    setBattles(prev => prev.map(b =>
      b.id === battleId ? { ...b, winner, status: 'forfeited' as const, bettingOpen: false } : b
    ));
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

  // ── Render guards ──────────────────────────────────────────────────────────
  if (loading && !user) {
    return (
      <AppShell hideNav>
        <div className="flex-1 flex items-center justify-center text-gray-400 font-bold text-xs uppercase tracking-widest">
          Loading Arena...
        </div>
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

  const activeInvite = invites.find(i => i.id === activeInviteId);

  // Props passed to every AppShell that shows the header bell
  const notificationCenterProps = {
    onAccept: handleInlineAccept,
    onReject: handleInlineReject,
  };

  if (currentScreen === 'battle_request') {
    return (
      <AppShell hideNav>
        <BattleRequestScreen
          invite={activeInvite as unknown as BattleInvite}
          currentUserName={user.name}
          onAccept={async (id) => {
            // Pass notification UUID for atomic cleanup — fixes INVITE_NOT_PENDING
            const result = await acceptBattleRequest(id, activeNotificationId ?? undefined);
            if (result && 'error' in result) {
              if (result.error === 'INVITE_NOT_PENDING') throw new Error('This request is no longer available');
              throw new Error('Something went wrong');
            }
            if (activeNotificationId) await markRead(activeNotificationId);
            const snapshot = battleStateSnapshots.find((s) => s.inviteId === id);
            setActiveBattleId(id);
            setActiveBattleConfig({
              opponent: snapshot?.challengerId === user.name ? (snapshot?.opponentId || activeInvite?.to || 'Opponent') : (snapshot?.challengerId || activeInvite?.from || 'Opponent'),
              challenge: snapshot?.challenge || activeInvite?.challenge || '10 Pushups',
              target: 10,
              scheduledTime: Date.now(),
            });
            setCurrentScreen('battle');
          }}
          onReject={async (id) => {
            const result = await rejectBattleRequest(id, activeNotificationId ?? undefined);
            if (result && 'error' in result) {
              if (result.error === 'INVITE_NOT_PENDING') throw new Error('This request is no longer available');
              throw new Error('Something went wrong');
            }
            if (activeNotificationId) await markRead(activeNotificationId);
            setCurrentScreen('arena');
          }}
          onBack={() => setCurrentScreen('arena')}
        />
      </AppShell>
    );
  }

  if (currentScreen === 'notifications') {
    return (
      <AppShell
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        notificationCenterProps={notificationCenterProps}
      >
        <NotificationsSection
          userId={user.name}
          notifications={notifications}
          onMarkRead={markRead}
          onNotificationTap={async (notif) => {
            // Always re-fetch the invite from the DB before navigating, so the
            // destination screen (BattleRequestScreen / WaitingPage) sees the
            // current status. Without this, the opponent could land on a
            // BattleRequestScreen for an invite that was just rejected
            // (stale-state race). Mirror the same approach for join_reminder /
            // battle_accepted so the Challenger's WaitingPage always has a
            // populated `activeInvite`.
            if (notif.inviteId) {
              try {
                const fresh = await getInviteById(notif.inviteId);
                if (fresh) {
                  setInvites(prev => {
                    const exists = prev.some(i => i.id === fresh.id);
                    // Map uppercase BattleInviteStatus → legacy lowercase Invite status
                    const legacyStatus = (() => {
                      const s = fresh.status.toLowerCase();
                      if (s === 'rejected' || s === 'archived') return 'rejected' as const;
                      if (s === 'accepted' || s === 'live' || s === 'checked_in_opponent') return 'accepted' as const;
                      return 'pending' as const;
                    })();
                    return exists
                      ? prev.map(i => i.id === fresh.id ? { ...i, status: legacyStatus, scheduledTime: fresh.scheduledTime } : i)
                      : [...prev, {
                          id: fresh.id,
                          from: fresh.from,
                          to: fresh.to,
                          challenge: fresh.challenge,
                          scheduledTime: fresh.scheduledTime,
                          status: legacyStatus,
                          isPublic: fresh.isPublic,
                          timestamp: fresh.timestamp,
                        } satisfies Invite];
                  });
                }
              } catch (e) {
                console.error('[notif tap] re-fetch invite error:', e);
              }
            }
            if (notif.type === 'battle_request' && notif.inviteId) {
              setActiveInviteId(notif.inviteId);
              setActiveNotificationId(notif.id);
              setCurrentScreen('battle_request' as AppScreen);
            } else if (['join_reminder', 'battle_accepted'].includes(notif.type) && notif.inviteId) {
              setActiveInviteId(notif.inviteId);
              setActiveNotificationId(notif.id);
              setActiveBattleId(notif.inviteId);
              setCurrentScreen('battle' as AppScreen);
            }
          }}
          onBack={() => setCurrentScreen('dashboard')}
        />
      </AppShell>
    );
  }

  if (currentScreen === 'referral') {
    return (
      <AppShell
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        unreadNotificationCount={unreadCount}
        onNotificationsClick={() => setCurrentScreen('notifications')}
        notificationCenterProps={notificationCenterProps}
      >
        <ReferralPage user={user} setPoints={setPoints} />
      </AppShell>
    );
  }

  return (
    <AppShell
      currentScreen={currentScreen}
      onNavigate={setCurrentScreen}
      unreadNotificationCount={unreadCount}
      onNotificationsClick={() => setCurrentScreen('notifications')}
      notificationCenterProps={notificationCenterProps}
    >
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
            const req: FriendRequest = {
              id: crypto.randomUUID(), from: user.name, to: name, status: 'pending', timestamp: Date.now(),
            };
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
          onNavigateToBattle={(inviteId) => {
            setActiveInviteId(inviteId);
            setActiveBattleId(inviteId);
            const snap = battleStateSnapshots.find((s) => s.inviteId === inviteId);
            const invite = invites.find((i) => i.id === inviteId);
            setActiveBattleConfig({
              opponent: snap?.challengerId === user.name ? (snap?.opponentId || invite?.to || 'Opponent') : (snap?.challengerId || invite?.from || 'Opponent'),
              challenge: snap?.challenge || invite?.challenge || '10 Pushups',
              target: 10,
              scheduledTime: Date.now(),
            });
            setCurrentScreen('battle');
          }}
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
