// types/index.ts
export type AppScreen = 'dashboard' | 'arena' | 'battle' | 'profile' | 'leaderboard' | 'live' | 'referral' | 'community';

export interface UserProfile {
  name: string;
  phone: string;
  countryCode: string;
  points: number;
  streak: number;
  wins: number;
  losses: number;
  referralCode?: string;
}

export interface PlayerStats {
  name: string;
  wins: number;
  streak: number;
}

export interface Comment {
  id: string;
  user: string;
  text: string;
}

export type Reaction = Record<string, string[]>;

export type BattleStatus = 'upcoming' | 'live' | 'completed' | 'forfeited';

export interface LiveBattle {
  id: string;
  p1: PlayerStats;
  p2: PlayerStats;
  challenge: string;
  pool: number;
  p1Reps: number;
  p2Reps: number;
  target: number;
  timeLeft: string;
  comments: Comment[];
  reactions: Reaction;
  winner?: string;
  scheduledTime?: number;
  status: BattleStatus;
  isPublic: boolean;
  bettingOpen: boolean;
  spectatorCount?: number;
}

export interface BetRecord {
  id: string;
  battleId: string;
  battleName: string;
  challenge: string;
  playerBetOn: string;
  opponent: string;
  amount: number;
  winner: string;
  status: 'won' | 'lost';
  timestamp: number;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  wins: number;
  streak: number;
  earnings: number;
  stars: number;
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface FriendRequest {
  id: string;
  from: string;
  to: string;
  status: FriendRequestStatus;
  timestamp: number;
}

export type InviteStatus = 'pending' | 'accepted' | 'rejected';

export interface Invite {
  id: string;
  from: string;
  to: string;
  challenge: string;
  scheduledTime: number;
  status: InviteStatus;
  isPublic: boolean;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

export interface ChatThread {
  id: string;
  participants: string[];
  messages: ChatMessage[];
}

export interface Referral {
  id: string;
  referrerName: string;
  referredName: string;
  pointsAwarded: number;
  timestamp: number;
}

export interface Poll {
  battleId: string;
  votes: Record<string, string[]>;
  closed: boolean;
}

// Livestream Battle Experience Types
export type GiftType = 'confetti' | 'lightning' | 'crown' | 'fire';

export interface GiftEffect {
  id: string;
  giftType: GiftType;
  senderName: string;
  timestamp: number;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  x: number;
  timestamp: number;
}

export interface RepPulseEvent {
  id: string;
  player: 'p1' | 'p2';
  count: number;
  timestamp: number;
}

export interface RepPulseBroadcast {
  type: 'rep_pulse';
  player: 'p1' | 'p2';
  count: number;
  timestamp: number;
}

export interface ReactionBroadcast {
  type: 'reaction';
  emoji: string;
  senderName: string;
  x: number;
  timestamp: number;
}

export interface GiftBroadcast {
  type: 'gift';
  giftType: GiftType;
  senderName: string;
  timestamp: number;
}

export interface PollVoteBroadcast {
  type: 'poll_vote';
  votedFor: string;
  totalVotes: Record<string, number>;
}

export interface SpectatorCountBroadcast {
  type: 'spectator_count';
  count: number;
}

// Community Feed Types
export type PostType = 'question' | 'poll' | 'meme';

export interface CommunityPost {
  id: string;
  authorName: string;
  postType: PostType;
  content: {
    text?: string; // question text or meme caption
    imageUrl?: string; // meme image
    pollQuestion?: string;
    pollOptions?: string[]; // 2-4 options
  };
  likeCount: number;
  commentCount: number;
  repostCount: number;
  createdAt: number; // timestamp
  isLikedByUser: boolean;
  isRepostedByUser: boolean;
  userVotedOptionIndex?: number; // for polls
}

export interface PostComment {
  id: string;
  postId: string;
  authorName: string;
  text: string;
  createdAt: number;
}
