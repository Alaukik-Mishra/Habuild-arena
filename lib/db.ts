import { supabase } from './supabase';
import {
  LiveBattle, Invite, FriendRequest, ChatThread, ChatMessage,
  GiftType,
  RepPulseBroadcast, ReactionBroadcast, GiftBroadcast, PollVoteBroadcast, SpectatorCountBroadcast,
  BattleInviteStatus,
} from '@/types';

export type BattleMachineUiState = 'pending' | 'active' | 'live' | 'rejected' | 'archived';

export interface BattleStateSnapshot {
  inviteId: string;
  challengerId: string;
  opponentId: string;
  challenge: string;
  scheduledTime: number;
  inviteStatus: BattleInviteStatus;
  battleStatus: string | null;
  uiState: BattleMachineUiState;
  battleId: string | null;
  isPublic: boolean;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function getProfileByPhone(phone: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();
  if (error) throw new Error(`DB error: ${error.message} (code: ${error.code})`);
  return data || null;
}

export async function upsertProfile(profile: {
  id: string;
  name: string;
  phone: string;
  country_code: string;
  coins?: number;
  streak?: number;
  wins?: number;
  losses?: number;
  stars?: number;
  referral_code?: string;
}) {
  const { error } = await supabase.from('profiles').upsert(
    { ...profile },
    { onConflict: 'phone', ignoreDuplicates: false }
  );
  if (error) throw new Error(`DB error: ${error.message} (code: ${error.code})`);
}

export async function updateProfile(
  phone: string,
  updates: { wins?: number; losses?: number; streak?: number; coins?: number }
) {
  const { error } = await supabase.from('profiles').update(updates).eq('phone', phone);
  if (error) throw error;
}

export async function getAllUsers(): Promise<string[]> {
  const { data, error } = await supabase.from('profiles').select('name');
  if (error) throw error;
  return (data || []).map((r: { name: string }) => r.name);
}

export async function getBattles(): Promise<LiveBattle[]> {
  const { data, error } = await supabase
    .from('battles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    p1: { name: row.p1_name, wins: row.p1_wins, streak: row.p1_streak },
    p2: { name: row.p2_name, wins: row.p2_wins, streak: row.p2_streak },
    challenge: row.challenge,
    pool: row.pool,
    p1Reps: row.p1_reps,
    p2Reps: row.p2_reps,
    target: row.target,
    timeLeft: row.time_left,
    comments: row.comments || [],
    reactions: row.reactions || {},
    winner: row.winner,
    scheduledTime: row.scheduled_time ? Number(row.scheduled_time) : undefined,
    status: row.status,
    isPublic: row.is_public,
    bettingOpen: row.betting_open,
  })) as LiveBattle[];
}

export async function createBattle(battle: Omit<LiveBattle, 'id'> & { id?: string }) {
  // If an explicit id is provided (e.g. tryGoLive reusing the invite UUID),
  // honour it so navigation IDs stay consistent across the invite -> battle
  // boundary. Otherwise let Postgres generate a fresh UUID.
  const insertPayload: Record<string, unknown> = {
    p1_name: battle.p1.name,
    p1_wins: battle.p1.wins,
    p1_streak: battle.p1.streak,
    p2_name: battle.p2.name,
    p2_wins: battle.p2.wins,
    p2_streak: battle.p2.streak,
    challenge: battle.challenge,
    pool: battle.pool,
    p1_reps: battle.p1Reps,
    p2_reps: battle.p2Reps,
    target: battle.target,
    time_left: battle.timeLeft,
    comments: battle.comments,
    reactions: battle.reactions,
    winner: battle.winner,
    scheduled_time: battle.scheduledTime ? battle.scheduledTime : null,
    status: battle.status,
    is_public: battle.isPublic,
    betting_open: battle.bettingOpen,
  };
  if (battle.id) insertPayload.id = battle.id;
  const { data, error } = await supabase.from('battles').insert(insertPayload).select('id').single();
  if (error) throw new Error(`DB error: ${error.message} (code: ${error.code})`);
  return data.id as string;
}

export async function updateBattle(id: string, updates: Partial<LiveBattle> & { winner?: string; status?: string; bettingOpen?: boolean }) {
  const payload: Record<string, unknown> = {};
  if (updates.p1) {
    payload.p1_name = updates.p1.name;
    payload.p1_wins = updates.p1.wins;
    payload.p1_streak = updates.p1.streak;
  }
  if (updates.p2) {
    payload.p2_name = updates.p2.name;
    payload.p2_wins = updates.p2.wins;
    payload.p2_streak = updates.p2.streak;
  }
  if (updates.p1Reps !== undefined) payload.p1_reps = updates.p1Reps;
  if (updates.p2Reps !== undefined) payload.p2_reps = updates.p2Reps;
  if (updates.winner !== undefined) payload.winner = updates.winner;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.bettingOpen !== undefined) payload.betting_open = updates.bettingOpen;
  if (updates.reactions !== undefined) payload.reactions = updates.reactions;
  if (updates.comments !== undefined) payload.comments = updates.comments;
  const { error } = await supabase.from('battles').update(payload).eq('id', id);
  if (error) throw error;
}

export async function getInviteById(inviteId: string): Promise<import('@/types').BattleInvite | null> {
  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .eq('id', inviteId)
    .maybeSingle();
  if (error) throw new Error(`DB error: ${error.message}`);
  if (!data) return null;
  return {
    id: data.id,
    from: data.from_name,
    to: data.to_name,
    challenge: data.challenge,
    scheduledTime: Number(data.scheduled_time),
    status: toBattleInviteStatus(data.status),
    isPublic: data.is_public,
    timestamp: new Date(data.created_at).getTime(),
    checkinDeadline: data.checkin_deadline ? new Date(data.checkin_deadline).getTime() : undefined,
    challengerCheckedIn: data.challenger_checked_in ?? false,
    opponentCheckedIn: data.opponent_checked_in ?? false,
  };
}

// Maps any invite status (legacy lowercase OR new uppercase BattleInviteStatus)
// to the legacy lowercase `InviteStatus` used by Arena's local `Invite` state.
// This is the bridge that fixes the "Both Sides" bug where uppercase rows
// written by `createBattleRequest` were invisible to the opponent's Arena.
function normaliseInviteStatus(raw: unknown): Invite['status'] {
  if (typeof raw !== 'string') return 'pending';
  const lower = raw.toLowerCase();
  // Map BattleInviteStatus values onto the legacy 3-value union.
  if (lower === 'accepted') return 'accepted';
  if (lower === 'rejected' || lower === 'archived') return 'rejected';
  // PENDING, ACCEPTED-but-not-yet-checked-in, LIVE, CHECKED_IN_OPPONENT all map to
  // "pending" from the Arena's perspective until the row also has a battle row.
  // We treat LIVE as 'accepted' so it surfaces in the "accepted" UI bucket.
  if (lower === 'live') return 'accepted';
  return 'pending';
}

function toBattleInviteStatus(raw: unknown): BattleInviteStatus {
  if (typeof raw !== 'string') return 'PENDING';
  const upper = raw.toUpperCase();
  if (upper === 'ACCEPTED') return 'ACCEPTED';
  if (upper === 'REJECTED') return 'REJECTED';
  if (upper === 'CHECKED_IN_OPPONENT') return 'CHECKED_IN_OPPONENT';
  if (upper === 'LIVE') return 'LIVE';
  if (upper === 'ARCHIVED') return 'ARCHIVED';
  return 'PENDING';
}

function toBattleMachineUiState(
  inviteStatus: BattleInviteStatus,
  battleStatus: string | null,
): BattleMachineUiState {
  const lowerBattle = battleStatus?.toLowerCase();
  if (lowerBattle === 'live' || inviteStatus === 'LIVE') return 'live';
  if (lowerBattle === 'active') return 'active';
  if (lowerBattle === 'pending') return 'pending';
  if (inviteStatus === 'PENDING') return 'pending';
  if (inviteStatus === 'ACCEPTED' || inviteStatus === 'CHECKED_IN_OPPONENT') return 'active';
  if (inviteStatus === 'REJECTED') return 'rejected';
  return 'archived';
}

export async function getInvites(userName: string): Promise<Invite[]> {
  const { data, error } = await supabase
    .from('invites')
    .select('*')
    // Bidirectional fetch: any invite where I am the challenger OR the opponent.
    .or(`from_name.eq.${userName},to_name.eq.${userName}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    from: row.from_name,
    to: row.to_name,
    challenge: row.challenge,
    scheduledTime: Number(row.scheduled_time),
    status: normaliseInviteStatus(row.status),
    battleStatus: toBattleInviteStatus(row.status),
    isPublic: row.is_public,
    timestamp: new Date(row.created_at).getTime(),
  })) as Invite[];
}

export async function getBattleStateForUser(userName: string): Promise<BattleStateSnapshot[]> {
  const [{ data: invites, error: inviteError }, { data: battles, error: battleError }] = await Promise.all([
    supabase
      .from('invites')
      .select('*')
      .or(`from_name.eq.${userName},to_name.eq.${userName}`)
      .order('created_at', { ascending: false }),
    supabase
      .from('battles')
      .select('id,status,p1_name,p2_name')
      .or(`p1_name.eq.${userName},p2_name.eq.${userName}`),
  ]);

  if (inviteError) throw inviteError;
  if (battleError) throw battleError;

  const battleByInviteId = new Map<string, { id: string; status: string }>();
  for (const row of battles || []) {
    battleByInviteId.set(row.id as string, {
      id: row.id as string,
      status: (row.status as string) ?? '',
    });
  }

  return (invites || []).map((row) => {
    const inviteStatus = toBattleInviteStatus(row.status);
    const linkedBattle = battleByInviteId.get(row.id as string);
    return {
      inviteId: row.id as string,
      challengerId: row.from_name as string,
      opponentId: row.to_name as string,
      challenge: row.challenge as string,
      scheduledTime: Number(row.scheduled_time),
      inviteStatus,
      battleStatus: linkedBattle?.status ?? null,
      uiState: toBattleMachineUiState(inviteStatus, linkedBattle?.status ?? null),
      battleId: linkedBattle?.id ?? null,
      isPublic: Boolean(row.is_public),
    } satisfies BattleStateSnapshot;
  });
}

export function subscribeToBattleState(
  userName: string,
  onSync: (snapshots: BattleStateSnapshot[]) => void,
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const syncNow = async () => {
    try {
      const snapshots = await getBattleStateForUser(userName);
      onSync(snapshots);
    } catch (e) {
      console.error('[subscribeToBattleState] sync failed:', e);
    }
  };

  const scheduleSync = () => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      void syncNow();
    }, 40);
  };

  const channel = supabase
    .channel(`battle-state:${userName}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'invites',
      },
      (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => {
        const row = (payload.new && Object.keys(payload.new).length > 0 ? payload.new : payload.old) || {};
        const from = row.from_name;
        const to = row.to_name;
        if (from !== userName && to !== userName) return;
        scheduleSync();
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'battles',
      },
      (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => {
        const row = (payload.new && Object.keys(payload.new).length > 0 ? payload.new : payload.old) || {};
        const p1 = row.p1_name;
        const p2 = row.p2_name;
        if (p1 !== userName && p2 !== userName) return;
        scheduleSync();
      }
    )
    .subscribe();

  void syncNow();
  return () => {
    if (timer) clearTimeout(timer);
    supabase.removeChannel(channel);
  };
}

export async function createInvite(invite: Omit<Invite, 'id' | 'timestamp'>) {
  const { data, error } = await supabase.from('invites').insert({
    from_name: invite.from,
    to_name: invite.to,
    challenge: invite.challenge,
    scheduled_time: invite.scheduledTime,
    status: invite.status,
    is_public: invite.isPublic,
  }).select('id').single();
  if (error) throw new Error(`DB error: ${error.message} (code: ${error.code})`);
  return data.id as string;
}

export async function updateInviteStatus(id: string, status: Invite['status']) {
  const { error } = await supabase.from('invites').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function getFriendRequests(userName: string): Promise<FriendRequest[]> {
  const { data, error } = await supabase
    .from('friend_requests')
    .select('*')
    .or(`from_name.eq.${userName},to_name.eq.${userName}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    from: row.from_name,
    to: row.to_name,
    status: row.status,
    timestamp: new Date(row.created_at).getTime(),
  })) as FriendRequest[];
}

export async function createFriendRequest(req: Omit<FriendRequest, 'id' | 'timestamp'>) {
  const { error } = await supabase.from('friend_requests').insert({
    from_name: req.from,
    to_name: req.to,
    status: req.status,
  });
  if (error) throw error;
}

export async function updateFriendRequestStatus(id: string, status: FriendRequest['status']) {
  const { error } = await supabase.from('friend_requests').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function getChatThreads(userName: string): Promise<ChatThread[]> {
  const { data: threads, error: threadError } = await supabase
    .from('chat_threads')
    .select('*')
    .contains('participants', [userName]);
  if (threadError) throw threadError;
  if (!threads || threads.length === 0) return [];

  const threadIds = threads.map((t: { id: string }) => t.id);
  const { data: messages, error: msgError } = await supabase
    .from('chat_messages')
    .select('*')
    .in('thread_id', threadIds)
    .order('timestamp', { ascending: true });
  if (msgError) throw msgError;

  return threads.map((t: { id: string; participants: string[] }) => ({
    id: t.id,
    participants: t.participants,
    messages: (messages || [])
      .filter((m: { thread_id: string }) => m.thread_id === t.id)
      .map((m: { id: string; sender: string; text: string; timestamp: number }) => ({
        id: m.id,
        sender: m.sender,
        text: m.text,
        timestamp: Number(m.timestamp),
      })),
  })) as ChatThread[];
}

export async function createChatThread(participants: string[]): Promise<string> {
  const { data, error } = await supabase
    .from('chat_threads')
    .insert({ participants })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function sendChatMessage(
  threadId: string,
  sender: string,
  text: string,
  timestamp: number
) {
  const { error } = await supabase.from('chat_messages').insert({
    thread_id: threadId,
    sender,
    text,
    timestamp,
  });
  if (error) throw error;
}

export function subscribeToChat(
  threadId: string,
  onMessage: (msg: ChatMessage) => void
): () => void {
  const channel = supabase
    .channel(`chat:${threadId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `thread_id=eq.${threadId}`,
      },
      (payload: { new: { id: string; sender: string; text: string; timestamp: number } }) => {
        const row = payload.new;
        onMessage({
          id: row.id,
          sender: row.sender,
          text: row.text,
          timestamp: Number(row.timestamp),
        });
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export function subscribeToBattle(
  battleId: string,
  onUpdate: (update: { p1Reps?: number; p2Reps?: number; status?: string; winner?: string }) => void
): () => void {
  const channel = supabase
    .channel(`battle:${battleId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'battles',
        filter: `id=eq.${battleId}`,
      },
      (payload: { new: { p1_reps: number; p2_reps: number; status: string; winner: string } }) => {
        const row = payload.new;
        onUpdate({
          p1Reps: row.p1_reps,
          p2Reps: row.p2_reps,
          status: row.status,
          winner: row.winner,
        });
      }
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export async function createReferral(referrerName: string, referredName: string): Promise<void> {
  const { error } = await supabase.from('referrals').insert({
    referrer_name: referrerName,
    referred_name: referredName,
    points_awarded: 20,
  });
  if (error) throw error;
}

export async function getReferralStats(
  userName: string
): Promise<{ count: number; pointsEarned: number }> {
  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_name', userName);
  if (error) throw error;
  const count = (data || []).length;
  const pointsEarned = count * 20;
  return { count, pointsEarned };
}

export function subscribeLivestreamChannel(
  battleId: string,
  handlers: {
    onRepPulse?: (event: RepPulseBroadcast) => void;
    onReaction?: (event: ReactionBroadcast) => void;
    onGift?: (event: GiftBroadcast) => void;
    onPollVote?: (event: PollVoteBroadcast) => void;
    onSpectatorCount?: (event: SpectatorCountBroadcast) => void;
  }
): () => void {
  let channel = supabase.channel(`battle:${battleId}`);

  if (handlers.onRepPulse) {
    const cb = handlers.onRepPulse;
    channel = channel.on('broadcast', { event: 'rep_pulse' }, ({ payload }: { payload: RepPulseBroadcast }) => cb(payload));
  }
  if (handlers.onReaction) {
    const cb = handlers.onReaction;
    channel = channel.on('broadcast', { event: 'reaction' }, ({ payload }: { payload: ReactionBroadcast }) => cb(payload));
  }
  if (handlers.onGift) {
    const cb = handlers.onGift;
    channel = channel.on('broadcast', { event: 'gift' }, ({ payload }: { payload: GiftBroadcast }) => cb(payload));
  }
  if (handlers.onPollVote) {
    const cb = handlers.onPollVote;
    channel = channel.on('broadcast', { event: 'poll_vote' }, ({ payload }: { payload: PollVoteBroadcast }) => cb(payload));
  }
  if (handlers.onSpectatorCount) {
    const cb = handlers.onSpectatorCount;
    channel = channel.on('broadcast', { event: 'spectator_count' }, ({ payload }: { payload: SpectatorCountBroadcast }) => cb(payload));
  }

  channel.subscribe();
  return () => { supabase.removeChannel(channel); };
}

export async function sendGift(
  battleId: string,
  senderName: string,
  giftType: GiftType,
  coinCost: number,
  channel: ReturnType<typeof supabase.channel>
): Promise<boolean> {
  if (typeof coinCost !== 'number' || !Number.isFinite(coinCost) || !Number.isInteger(coinCost) || coinCost <= 0) {
    return false;
  }
  try {
    const { data: profileData, error: fetchError } = await supabase
      .from('profiles')
      .select('coins')
      .eq('name', senderName)
      .single();
    if (fetchError || !profileData) return false;
    const balance = Number(profileData.coins);
    if (!Number.isFinite(balance) || balance < coinCost) return false;

    const { error: insertError } = await supabase.from('battle_gifts').insert({
      battle_id: battleId,
      sender_name: senderName,
      gift_type: giftType,
      coin_cost: coinCost,
    });
    if (insertError) return false;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ coins: balance - coinCost })
      .eq('name', senderName);
    if (updateError) return false;

    await channel.send({
      type: 'broadcast',
      event: 'gift',
      payload: { type: 'gift', giftType, senderName, timestamp: Date.now() },
    });

    return true;
  } catch {
    return false;
  }
}

export async function castPollVote(
  battleId: string,
  voterName: string,
  votedFor: string,
  channel: ReturnType<typeof supabase.channel>
): Promise<void> {
  await supabase.from('battle_poll_votes').insert({
    battle_id: battleId,
    voter_name: voterName,
    voted_for: votedFor,
  });

  const { data } = await supabase
    .from('battle_poll_votes')
    .select('voted_for')
    .eq('battle_id', battleId);

  const totalVotes: Record<string, number> = {};
  for (const row of data || []) {
    totalVotes[row.voted_for] = (totalVotes[row.voted_for] || 0) + 1;
  }

  await channel.send({
    type: 'broadcast',
    event: 'poll_vote',
    payload: { type: 'poll_vote', votedFor, totalVotes },
  });
}

export async function getPollVotes(battleId: string): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('battle_poll_votes')
    .select('voted_for')
    .eq('battle_id', battleId);

  const counts: Record<string, number> = {};
  for (const row of data || []) {
    counts[row.voted_for] = (counts[row.voted_for] || 0) + 1;
  }
  return counts;
}

export async function broadcastRepPulse(
  battleId: string,
  player: 'p1' | 'p2',
  count: number
): Promise<void> {
  const channel = supabase.channel(`battle:${battleId}`);
  await channel.send({
    type: 'broadcast',
    event: 'rep_pulse',
    payload: { type: 'rep_pulse', player, count, timestamp: Date.now() },
  });
}

// ─── Community Feed ───────────────────────────────────────────────────────────

import type { CommunityPost, PostComment } from '@/types';

export async function getPosts(userName: string): Promise<CommunityPost[]> {
  const [postsResult, likesResult, repostsResult, votesResult, likeCounts, repostCounts, commentCounts] =
    await Promise.all([
      supabase.from('community_posts').select('*').order('created_at', { ascending: false }),
      supabase.from('post_likes').select('post_id').eq('user_name', userName),
      supabase.from('post_reposts').select('post_id').eq('user_name', userName),
      supabase.from('post_poll_votes').select('post_id, option_index').eq('user_name', userName),
      supabase.from('post_likes').select('post_id'),
      supabase.from('post_reposts').select('post_id'),
      supabase.from('post_comments').select('post_id'),
    ]);

  if (postsResult.error) throw postsResult.error;

  const likedPostIds = new Set((likesResult.data || []).map((r: { post_id: string }) => r.post_id));
  const repostedPostIds = new Set((repostsResult.data || []).map((r: { post_id: string }) => r.post_id));
  const voteMap = new Map<string, number>(
    (votesResult.data || []).map((r: { post_id: string; option_index: number }) => [r.post_id, r.option_index])
  );

  const likeCountMap = new Map<string, number>();
  for (const r of (likeCounts.data || []) as { post_id: string }[]) {
    likeCountMap.set(r.post_id, (likeCountMap.get(r.post_id) ?? 0) + 1);
  }
  const repostCountMap = new Map<string, number>();
  for (const r of (repostCounts.data || []) as { post_id: string }[]) {
    repostCountMap.set(r.post_id, (repostCountMap.get(r.post_id) ?? 0) + 1);
  }
  const commentCountMap = new Map<string, number>();
  for (const r of (commentCounts.data || []) as { post_id: string }[]) {
    commentCountMap.set(r.post_id, (commentCountMap.get(r.post_id) ?? 0) + 1);
  }

  return (postsResult.data || []).map((row: {
    id: string;
    author_name: string;
    post_type: string;
    content: CommunityPost['content'];
    created_at: string;
  }): CommunityPost => ({
    id: row.id,
    authorName: row.author_name,
    postType: row.post_type as CommunityPost['postType'],
    content: row.content,
    likeCount: likeCountMap.get(row.id) ?? 0,
    commentCount: commentCountMap.get(row.id) ?? 0,
    repostCount: repostCountMap.get(row.id) ?? 0,
    createdAt: new Date(row.created_at).getTime(),
    isLikedByUser: likedPostIds.has(row.id),
    isRepostedByUser: repostedPostIds.has(row.id),
    userVotedOptionIndex: voteMap.get(row.id),
  }));
}

export async function createPost(
  post: Omit<CommunityPost, 'id' | 'likeCount' | 'commentCount' | 'repostCount' | 'createdAt' | 'isLikedByUser' | 'isRepostedByUser'>
): Promise<string> {
  const { data, error } = await supabase
    .from('community_posts')
    .insert({
      author_name: post.authorName,
      post_type: post.postType,
      content: post.content,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase.from('community_posts').delete().eq('id', postId);
  if (error) throw error;
}

export async function toggleLike(postId: string, userName: string, isLiked: boolean): Promise<void> {
  if (isLiked) {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_name', userName);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('post_likes')
      .insert({ post_id: postId, user_name: userName });
    if (error) throw error;
  }
}

export async function addComment(postId: string, authorName: string, text: string): Promise<PostComment> {
  const { data, error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, author_name: authorName, text })
    .select('*')
    .single();
  if (error) throw error;
  return {
    id: data.id,
    postId: data.post_id,
    authorName: data.author_name,
    text: data.text,
    createdAt: new Date(data.created_at).getTime(),
  };
}

export async function getComments(postId: string): Promise<PostComment[]> {
  const { data, error } = await supabase
    .from('post_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((row: { id: string; post_id: string; author_name: string; text: string; created_at: string }) => ({
    id: row.id,
    postId: row.post_id,
    authorName: row.author_name,
    text: row.text,
    createdAt: new Date(row.created_at).getTime(),
  }));
}

export async function toggleRepost(postId: string, userName: string, isReposted: boolean): Promise<void> {
  if (isReposted) {
    const { error } = await supabase
      .from('post_reposts')
      .delete()
      .eq('post_id', postId)
      .eq('user_name', userName);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('post_reposts')
      .insert({ post_id: postId, user_name: userName });
    if (error) throw error;
  }
}

export async function castPostPollVote(postId: string, userName: string, optionIndex: number): Promise<void> {
  const { error } = await supabase
    .from('post_poll_votes')
    .insert({ post_id: postId, user_name: userName, option_index: optionIndex });
  if (error) throw error;
}

// ─── Battle Request Notifications ────────────────────────────────────────────

import type { BattleInvite, AppNotification } from '@/types';

/**
 * Creates a PENDING battle request invite and a `battle_request` notification
 * for the opponent. Validates inputs to prevent the "1-hour duration crashes
 * the app" class of bugs caused by sending undefined/NaN/non-integer values
 * to Supabase.
 *
 * Returns the new invite id on success, or `{ error }` for known failure modes
 * (DUPLICATE_REQUEST, INVALID_INPUT). Throws on unexpected DB errors.
 */
export async function createBattleRequest(
  from: string,
  to: string,
  challenge: string,
  isPublic: boolean,
  scheduledTimeSeconds?: number,
  betAmountCoins?: number,
  durationSeconds?: number,
): Promise<string | { error: string }> {
  // ── Input sanitisation ────────────────────────────────────────────────────
  if (typeof from !== 'string' || from.trim().length === 0) return { error: 'INVALID_INPUT' };
  if (typeof to !== 'string'   || to.trim().length === 0)   return { error: 'INVALID_INPUT' };
  if (typeof challenge !== 'string' || challenge.trim().length === 0) return { error: 'INVALID_INPUT' };
  if (from.trim() === to.trim()) return { error: 'INVALID_INPUT' };
  // Always sanitize into integer seconds first, then map to milliseconds for DB.
  // This avoids passing floats/NaN and keeps duration/time selection deterministic.
  const safeScheduledTimeSeconds =
    typeof scheduledTimeSeconds === 'number' && Number.isFinite(scheduledTimeSeconds) && scheduledTimeSeconds > 0
      ? Math.trunc(scheduledTimeSeconds)
      : Math.trunc(Date.now() / 1000);
  const safeScheduledTimeMs = safeScheduledTimeSeconds * 1000;
  const safeDurationSeconds =
    typeof durationSeconds === 'number' && Number.isFinite(durationSeconds) && durationSeconds > 0
      ? Math.trunc(durationSeconds)
      : 3600;
  const safeBetAmountCoins =
    typeof betAmountCoins === 'number' && Number.isFinite(betAmountCoins) && betAmountCoins >= 0
      ? Math.trunc(betAmountCoins)
      : 0;

  // Duplicate-PENDING guard
  const { data: existing } = await supabase
    .from('invites')
    .select('id')
    .eq('from_name', from)
    .eq('to_name', to)
    .eq('challenge', challenge)
    .eq('status', 'PENDING')
    .maybeSingle();

  if (existing) return { error: 'DUPLICATE_REQUEST' };

  const { data: profileRows } = await supabase
    .from('profiles')
    .select('name,wins,streak,coins')
    .in('name', [from, to]);
  const profileByName = new Map((profileRows || []).map((row) => [row.name as string, row]));
  const challengerProfile = profileByName.get(from);
  const opponentProfile = profileByName.get(to);
  if (safeBetAmountCoins > 0) {
    const challengerCoins = Number(challengerProfile?.coins ?? 0);
    if (!Number.isFinite(challengerCoins) || challengerCoins < safeBetAmountCoins) {
      return { error: 'INVALID_INPUT' };
    }
  }

  const { data, error } = await supabase
    .from('invites')
    .insert({
      from_name: from,
      to_name: to,
      challenge,
      is_public: isPublic,
      status: 'PENDING',
      scheduled_time: safeScheduledTimeMs,
    })
    .select('id')
    .single();

  if (error) throw new Error(`DB error: ${error.message} (code: ${error.code})`);

  const challengeTarget = (() => {
    const match = challenge.match(/\d+/);
    if (!match) return 10;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 10;
  })();
  const timeLeftString = `${String(Math.floor(safeDurationSeconds / 60)).padStart(2, '0')}:${String(safeDurationSeconds % 60).padStart(2, '0')}`;

  const { error: battleInsertError } = await supabase
    .from('battles')
    .insert({
      id: data.id,
      p1_name: from,
      p1_wins: Number(challengerProfile?.wins ?? 0),
      p1_streak: Number(challengerProfile?.streak ?? 0),
      p2_name: to,
      p2_wins: Number(opponentProfile?.wins ?? 0),
      p2_streak: Number(opponentProfile?.streak ?? 0),
      challenge,
      pool: safeBetAmountCoins > 0 ? safeBetAmountCoins * 2 : 0,
      p1_reps: 0,
      p2_reps: 0,
      target: challengeTarget,
      time_left: timeLeftString,
      comments: [],
      reactions: {},
      status: 'pending',
      is_public: isPublic,
      betting_open: false,
      scheduled_time: safeScheduledTimeMs,
    });
  if (battleInsertError) {
    await supabase.from('invites').delete().eq('id', data.id);
    throw new Error(`DB error: ${battleInsertError.message} (code: ${battleInsertError.code})`);
  }

  await createNotification({
    userId: to,
    type: 'battle_request',
    inviteId: data.id,
    payload: { challengerName: from, challengeName: challenge },
  });

  return data.id as string;
}

export async function acceptBattleRequest(
  inviteId: string,
  notificationId?: string
): Promise<void | { error: string }> {
  const { data: invite, error: fetchError } = await supabase
    .from('invites')
    .select('*')
    .eq('id', inviteId)
    .single();

  if (fetchError) throw new Error(`DB error: ${fetchError.message}`);
  if (invite.status !== 'PENDING') return { error: 'INVITE_NOT_PENDING' };

  const { error: inviteUpdateError } = await supabase
    .from('invites')
    .update({
      status: 'ACCEPTED',
    })
    .eq('id', inviteId);
  if (inviteUpdateError) throw new Error(`DB error: ${inviteUpdateError.message}`);

  const { error: battleUpdateError } = await supabase
    .from('battles')
    .update({ status: 'active' })
    .eq('id', inviteId)
    .eq('status', 'pending');
  if (battleUpdateError) throw new Error(`DB error: ${battleUpdateError.message}`);

  // Mark the battle_request notification as read atomically with the invite update
  if (notificationId) {
    const { error: notifError } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    if (notifError) {
      // Log inconsistency — next polling cycle will reconcile
      console.warn('[acceptBattleRequest] notification cleanup failed:', notifError.message);
    }
  }

  await createNotification({
    userId: invite.from_name,
    type: 'battle_accepted',
    inviteId,
    payload: { opponentName: invite.to_name, challengeName: invite.challenge },
  });
}

export async function rejectBattleRequest(
  inviteId: string,
  notificationId?: string
): Promise<void | { error: string }> {
  const { data: invite, error: fetchError } = await supabase
    .from('invites')
    .select('*')
    .eq('id', inviteId)
    .single();

  if (fetchError) throw new Error(`DB error: ${fetchError.message}`);
  if (invite.status !== 'PENDING') return { error: 'INVITE_NOT_PENDING' };

  const { error } = await supabase
    .from('invites')
    .update({ status: 'REJECTED' })
    .eq('id', inviteId);

  if (error) throw new Error(`DB error: ${error.message}`);

  // Mark the battle_request notification as read atomically with the invite update
  if (notificationId) {
    const { error: notifError } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    if (notifError) {
      console.warn('[rejectBattleRequest] notification cleanup failed:', notifError.message);
    }
  }

  await createNotification({
    userId: invite.from_name,
    type: 'battle_declined',
    inviteId,
    payload: { opponentName: invite.to_name, challengeName: invite.challenge },
  });
}

export async function recordCheckin(
  inviteId: string,
  role: 'challenger' | 'opponent'
): Promise<void | { error: string }> {
  const { data: invite, error: fetchError } = await supabase
    .from('invites')
    .select('*')
    .eq('id', inviteId)
    .single();

  if (fetchError) throw new Error(`DB error: ${fetchError.message}`);

  if (
    invite.checkin_deadline &&
    new Date(invite.checkin_deadline).getTime() < Date.now()
  ) {
    return { error: 'CHECKIN_DEADLINE_EXPIRED' };
  }

  const update =
    role === 'challenger'
      ? { challenger_checked_in: true }
      : { opponent_checked_in: true };

  const { error } = await supabase.from('invites').update(update).eq('id', inviteId);
  if (error) {
    // Column may not exist yet if migration hasn't been applied — degrade gracefully
    if (error.code === 'PGRST204') {
      console.warn('[recordCheckin] challenger_checked_in/opponent_checked_in columns missing — run migration 20240001000000');
      return;
    }
    throw new Error(`DB error: ${error.message}`);
  }

  // Atomically attempt the LIVE transition. If the OTHER user has already
  // checked in, this client is the one that observes both flags = true and
  // performs the state transition. The other client receives the LIVE update
  // via subscribeToInvite.
  // The "Rejoin loop" bug came from this never being called.
  try {
    await tryGoLive(inviteId);
  } catch (e) {
    // tryGoLive failures are non-fatal here — the next polling cycle (or the
    // partner's check-in) will retry the transition.
    console.warn('[recordCheckin] tryGoLive failed (will retry):', e);
  }
}

export async function tryGoLive(inviteId: string): Promise<boolean> {
  const { data: invite, error: fetchError } = await supabase
    .from('invites')
    .select('*')
    .eq('id', inviteId)
    .single();

  if (fetchError) throw new Error(`DB error: ${fetchError.message}`);

  // Both check-ins required; exit silently otherwise.
  if (!invite.challenger_checked_in || !invite.opponent_checked_in) return false;
  // Idempotency: if we've already transitioned to LIVE, don't insert a duplicate battle.
  if (invite.status === 'LIVE') return true;

  // Reuse the invite UUID as the battle id so the WaitingPage's
  // `setActiveBattleId(invite.id)` lands on the actual battle row created here.
  // (Previously the battle id was a fresh UUID, leaving the Battle screen
  //  with no matching row — the source of the "stuck on Rejoin" symptom.)
  await createBattle({
    id: inviteId,
    p1: { name: invite.from_name, wins: 0, streak: 0 },
    p2: { name: invite.to_name, wins: 0, streak: 0 },
    challenge: invite.challenge,
    pool: 0,
    p1Reps: 0,
    p2Reps: 0,
    target: 0,
    timeLeft: '60:00',
    comments: [],
    reactions: {},
    status: 'live',
    isPublic: invite.is_public,
    bettingOpen: false,
    scheduledTime: Number(invite.scheduled_time),
  });

  const { error } = await supabase
    .from('invites')
    .update({ status: 'LIVE' })
    .eq('id', inviteId);

  if (error) throw new Error(`DB error: ${error.message}`);

  return true;
}

export async function createNotification(
  notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>
): Promise<string> {
  const buildNotificationCopy = (
    n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>
  ): { title: string; message: string } => {
    const challenge = n.payload?.challengeName || 'battle';
    const challenger = n.payload?.challengerName || 'Someone';
    const opponent = n.payload?.opponentName || 'your opponent';
    switch (n.type) {
      case 'battle_request':
        return {
          title: 'New Battle Request',
          message: `${challenger} challenged you to ${challenge}.`,
        };
      case 'battle_accepted':
        return {
          title: 'Battle Accepted',
          message: `${opponent} accepted your challenge: ${challenge}.`,
        };
      case 'battle_declined':
        return {
          title: 'Battle Declined',
          message: `${opponent} declined your challenge: ${challenge}.`,
        };
      case 'join_reminder':
        return {
          title: 'Join Reminder',
          message: `Challenge accepted. Join ${challenge} within 1 hour.`,
        };
      case 'default_win':
        return {
          title: 'Default Win',
          message: 'You won by default because the opponent did not arrive in time.',
        };
      default:
        return {
          title: 'Notification',
          message: 'You have a new update.',
        };
    }
  };
  const content = buildNotificationCopy(notification);

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: notification.userId,
      title: content.title,
      message: content.message,
      type: notification.type,
      invite_id: notification.inviteId ?? null,
      payload: notification.payload,
    })
    .select('id')
    .single();

  if (error) {
    // Table missing
    if (error.code === 'PGRST205' || error.code === '42P01') {
      console.warn('[createNotification] notifications table missing — run migration 20240001000001');
      return '';
    }
    // Column missing (schema cache mismatch) — table exists but was created without all columns
    // Run migration 20240001000002 to fix: supabase db push
    if (error.code === 'PGRST204') {
      console.warn('[createNotification] notifications schema mismatch (missing column) — run migration 20240001000002');
      return '';
    }
    throw new Error(`DB error: ${error.message} (code: ${error.code})`);
  }
  return data.id as string;
}

export async function getNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    // Notifications table may not exist yet
    if (error.code === 'PGRST205' || error.code === '42P01') {
      console.warn('[getNotifications] notifications table missing — run migration 20240001000001');
      return [];
    }
    throw new Error(`DB error: ${error.message}`);
  }

  return (data || []).map(
    (row: {
      id: string;
      user_id: string;
      type: string;
      invite_id: string | null;
      payload: AppNotification['payload'];
      read: boolean;
      created_at: string;
    }): AppNotification => ({
      id: row.id,
      userId: row.user_id,
      type: row.type as AppNotification['type'],
      inviteId: row.invite_id ?? undefined,
      payload: row.payload ?? {},
      read: row.read,
      createdAt: new Date(row.created_at).getTime(),
    })
  );
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01') return; // table missing, ignore
    throw new Error(`DB error: ${error.message}`);
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId);

  if (error) throw new Error(`DB error: ${error.message}`);
}

export function subscribeToInvite(
  inviteId: string,
  onUpdate: (invite: BattleInvite) => void
): () => void {
  const channel = supabase
    .channel(`invite:${inviteId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'invites',
        filter: `id=eq.${inviteId}`,
      },
      (payload: { new: Record<string, unknown> }) => {
        const row = payload.new;
        onUpdate({
          id: row.id as string,
          from: row.from_name as string,
          to: row.to_name as string,
          challenge: row.challenge as string,
          scheduledTime: Number(row.scheduled_time),
          status: row.status as BattleInvite['status'],
          isPublic: row.is_public as boolean,
          timestamp: new Date(row.created_at as string).getTime(),
          checkinDeadline: row.checkin_deadline
            ? new Date(row.checkin_deadline as string).getTime()
            : undefined,
          challengerCheckedIn: (row.challenger_checked_in as boolean) ?? false,
          opponentCheckedIn: (row.opponent_checked_in as boolean) ?? false,
        });
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

export function subscribeToNotifications(
  userId: string,
  onNew: (notification: AppNotification) => void
): () => void {
  const channelId = `notifications:${userId}:${Math.random().toString(36).slice(2)}`;
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload: { new: Record<string, unknown> }) => {
        const row = payload.new;
        onNew({
          id: row.id as string,
          userId: row.user_id as string,
          type: row.type as AppNotification['type'],
          inviteId: (row.invite_id as string | null) ?? undefined,
          payload: (row.payload as AppNotification['payload']) ?? {},
          read: row.read as boolean,
          createdAt: new Date(row.created_at as string).getTime(),
        });
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
