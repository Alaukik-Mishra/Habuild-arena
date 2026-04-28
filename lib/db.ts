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
  if (error && error.code !== 'PGRST116') throw new Error(`DB error: ${error.message} (code: ${error.code})`);
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
  const { error } = await supabase.from('profiles').upsert(profile, { onConflict: 'phone' });
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
