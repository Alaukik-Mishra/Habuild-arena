import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Send, Search, Globe, Lock, ArrowLeft, UserPlus, Clock, ChevronDown } from 'lucide-react';
import { AppScreen, Invite, FriendRequest, ChatThread } from '../types';
import { subscribeToChat } from '../lib/db';

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
}

const CHALLENGE_TARGETS: Record<string, number> = {
  '10 Pushups': 10, '50 Squats': 50, '2 Min Plank': 120,
  '1 Min Burpees': 30, '100 Jumping Jacks': 100, '30 Second Sprint': 1,
};

function fmtTime(ts: number): string {
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60) return 'Just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

// Default datetime-local value = now + 1 hour
function defaultSchedule(): string {
  const d = new Date(Date.now() + 3600000);
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

export default function Arena({
  setScreen, setActiveBattleConfig, setActiveBattleId,
  invites, setInvites, friendRequests, setFriendRequests,
  chatThreads, setChatThreads, friends, allUsers, challenges,
  userName, onSendFriendRequest, onAcceptFriendRequest, onRejectFriendRequest,
  onCreateInvite, onSendMessage, onCreateChatThread,
}: Props) {
  const [tab, setTab] = useState<'challenges'|'chat'|'friends'>('challenges');
  const [showCreate, setShowCreate] = useState(false);
  const [selChallenge, setSelChallenge] = useState(challenges[0]);
  const [customChallenge, setCustomChallenge] = useState('');
  const [selUser, setSelUser] = useState('');
  const [findQuery, setFindQuery] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [scheduleValue, setScheduleValue] = useState(defaultSchedule);
  const [activeChat, setActiveChat] = useState<string|null>(null);
  const [chatInput, setChatInput] = useState('');
  const [friendTab, setFriendTab] = useState<'received'|'sent'>('received');
  const [showDropdown, setShowDropdown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const handleAcceptInvite = (id: string) => {
    const inv = invites.find(i => i.id === id);
    if (!inv) return;
    setInvites(prev => prev.map(i => i.id === id ? { ...i, status: 'accepted' as const } : i));
    setActiveBattleId(id);
    setActiveBattleConfig({ opponent: inv.from, challenge: inv.challenge, target: CHALLENGE_TARGETS[inv.challenge] || 10, scheduledTime: inv.scheduledTime });
    setScreen('battle');
  };

  const handleRejectInvite = (id: string) =>
    setInvites(prev => prev.map(i => i.id === id ? { ...i, status: 'rejected' as const } : i));

  const handleCreate = () => {
    const challenge = customChallenge.trim() || selChallenge;
    const opponent = selUser || findQuery.trim();
    if (!challenge || !opponent) return;
    const target = CHALLENGE_TARGETS[challenge] || 10;
    const scheduledTime = new Date(scheduleValue).getTime() || Date.now() + 60000;
    const newInvite: Invite = {
      id: 'i' + Date.now(),
      from: userName,
      to: opponent,
      challenge,
      scheduledTime,
      status: 'pending',
      isPublic,
      timestamp: Date.now(),
    };
    onCreateInvite(newInvite);
    setActiveBattleId(newInvite.id);
    setActiveBattleConfig({ opponent, challenge, target, scheduledTime });
    setShowCreate(false);
    setScreen('battle');
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
      <div className="flex-1 flex flex-col h-full bg-[#FDFCF7]">
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
        <div className="p-3 border-t border-gray-200 bg-[#F0F0F0] flex items-center space-x-2">
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
            className="bg-green-500 text-white w-10 h-10 rounded-full flex items-center justify-center active:scale-95 shadow-md"
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
          <button onClick={() => setShowCreate(false)} className="mr-3 text-gray-400 hover:text-gray-900"><ArrowLeft className="w-5 h-5" /></button>
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
              <select value={selUser} onChange={e => { setSelUser(e.target.value); setFindQuery(''); }} className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 mb-2 outline-none">
                <option value="">Select friend...</option>
                {friends.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            )}
            <div className="relative">
              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                <input
                  type="text"
                  value={findQuery}
                  onChange={e => { setFindQuery(e.target.value); setSelUser(''); }}
                  placeholder="Search any user..."
                  className="flex-1 bg-transparent text-sm outline-none"
                />
              </div>
              {findQuery && filteredUsers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg z-20 max-h-40 overflow-y-auto">
                  {filteredUsers.map(u => (
                    <button key={u} onClick={() => { setFindQuery(u); setSelUser(''); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center space-x-2">
                      <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs">{u[0]}</div>
                      <span>{u}</span>
                    </button>
                  ))}
                </div>
              )}
              {findQuery && filteredUsers.length === 0 && (
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
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Schedule (Date & Time)</label>
            <input
              type="datetime-local"
              value={scheduleValue}
              onChange={e => setScheduleValue(e.target.value)}
              className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-blue-500"
            />
            <p className="text-[10px] text-gray-400 mt-1">Battle goes live at this time. Betting closes when it starts.</p>
          </div>

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
        {(['challenges', 'friends', 'chat'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all capitalize ${tab === t ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>{t}</button>
        ))}
      </div>

      {tab === 'challenges' && (
        <div className="space-y-6">
          {sentInvites.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Your Sent Challenges</h3>
              {sentInvites.map(inv => (
                <div key={inv.id} className="bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 text-base">vs {inv.to}</h4>
                    <p className="text-[11px] text-blue-700 font-bold uppercase tracking-wide mt-0.5">{inv.challenge}</p>
                    <p className="text-[10px] text-gray-400 mt-1 flex items-center"><Clock className="w-3 h-3 mr-1" />{new Date(inv.scheduledTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">Pending</span>
                </div>
              ))}
            </div>
          )}
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
                    <button onClick={() => handleRejectInvite(inv.id)} className="w-11 h-11 bg-red-50 rounded-xl flex items-center justify-center text-red-500 border-2 border-red-100 active:bg-red-100"><X className="w-5 h-5" /></button>
                    <button onClick={() => handleAcceptInvite(inv.id)} className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center text-green-600 border-2 border-green-100 active:bg-green-100"><Check className="w-5 h-5" /></button>
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
    </div>
  );
}
