'use client';

import { useEffect, useState } from 'react';
import type { BattleInvite, BattleInviteStatus } from '../types/index';
import { filterSentRequests } from '../lib/battleRequestUtils';
import { subscribeToInvite } from '../lib/db';

interface SentRequestsTabProps {
  userName: string;
  invites: BattleInvite[];
  onInviteStatusChange: (id: string, status: BattleInviteStatus) => void;
}

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export default function SentRequestsTab({
  userName,
  invites,
  onInviteStatusChange,
}: SentRequestsTabProps) {
  // Local state tracks invite updates received via realtime subscriptions
  const [localInvites, setLocalInvites] = useState<BattleInvite[]>([]);

  // Merge prop invites with local realtime updates (local takes precedence)
  const mergedInvites = invites.map((invite) => {
    const local = localInvites.find((l) => l.id === invite.id);
    return local ?? invite;
  });

  const pendingInvites = filterSentRequests(mergedInvites, userName);

  // Subscribe to each pending invite for real-time status changes
  useEffect(() => {
    const unsubscribers = pendingInvites.map((invite) =>
      subscribeToInvite(invite.id, (updated) => {
        setLocalInvites((prev) => {
          const exists = prev.some((l) => l.id === updated.id);
          return exists
            ? prev.map((l) => (l.id === updated.id ? updated : l))
            : [...prev, updated];
        });
        if (updated.status !== 'PENDING') {
          onInviteStatusChange(updated.id, updated.status);
        }
      })
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
    // Re-subscribe whenever the set of pending invite IDs changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingInvites.map((i) => i.id).join(',')]);

  if (pendingInvites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
        <p className="text-sm">No pending requests</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3 p-4">
      {pendingInvites.map((invite) => (
        <SentRequestCard key={invite.id} invite={invite} />
      ))}
    </ul>
  );
}

function SentRequestCard({ invite }: { invite: BattleInvite }) {
  return (
    <li className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">{invite.to}</span>
        <span className="text-xs font-medium bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
          Waiting for Acceptance
        </span>
      </div>
      <p className="text-sm text-gray-600">{invite.challenge}</p>
      <p className="text-xs text-gray-400">{formatRelativeTime(invite.timestamp)}</p>
    </li>
  );
}
