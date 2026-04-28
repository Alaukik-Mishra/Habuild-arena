import { supabase } from './supabase';
import {
  LiveBattle, Invite, FriendRequest, ChatThread, ChatMessage,
  GiftType,
  RepPulseBroadcast, ReactionBroadcast, GiftBroadcast, PollVoteBroadcast, SpectatorCountBroadcast,
} from '@/types';

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
    .single();
  if (error && error.code !== 'PGRST116') throw error;
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
  const { error } = await supabase.from('profiles').upsert(profile, { onConflict: 'id' });
  if (error) throw error;
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
  const { error } = await supabase.from('battles').insert({
    id: battle.id || undefined,
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
  });
  if (error) throw error;
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

export async function getInvites(userName: string): Promise<Invite[]> {
  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .or(`from_name.eq.${userName},to_name.eq.${userName}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    from: row.from_name,
    to: row.to_name,
    challenge: row.challenge,
    scheduledTime: Number(row.scheduled_time),
    status: row.status,
    isPublic: row.is_public,
    timestamp: new Date(row.created_at).getTime(),
  })) as Invite[];
}

export async function createInvite(invite: Omit<Invite, 'id' | 'timestamp'>) {
  const { error } = await supabase.from('invites').insert({
    from_name: invite.from,
    to_name: invite.to,
    challenge: invite.challenge,
    scheduled_time: invite.scheduledTime,
    status: invite.status,
    is_public: invite.isPublic,
  });
  if (error) throw error;
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
  if (coinCost <= 0) return false;
  try {
    const { error: insertError } = await supabase.from('battle_gifts').insert({
      battle_id: battleId,
      sender_name: senderName,
      gift_type: giftType,
      coin_cost: coinCost,
    });
    if (insertError) return false;

    const { data: profileData, error: fetchError } = await supabase
      .from('profiles')
      .select('coins')
      .eq('name', senderName)
      .single();
    if (fetchError || !profileData) return false;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ coins: (profileData.coins as number) - coinCost })
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
