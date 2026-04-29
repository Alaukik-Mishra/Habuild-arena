'use client';

import { useState, useEffect, useCallback } from 'react';
import type { BattleInvite } from '../types/index';
import { computeTimeRemaining } from '../lib/battleRequestUtils';
import { subscribeToInvite } from '../lib/db';

interface WaitingPageProps {
  invite: BattleInvite;
  role: 'challenger' | 'opponent';
  currentUserName: string;
  onCheckIn: (inviteId: string, role: 'challenger' | 'opponent') => Promise<void>;
  onGoLive: (inviteId: string) => void;
  onBack: () => void;
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

export default function WaitingPage({
  invite,
  role,
  onCheckIn,
  onGoLive,
  onBack,
}: WaitingPageProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(
    invite.checkinDeadline ? computeTimeRemaining(invite.checkinDeadline) : -1
  );
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (!invite.checkinDeadline) return;

    const tick = () => {
      setTimeRemaining(computeTimeRemaining(invite.checkinDeadline!));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [invite.checkinDeadline]);

  // Subscribe to invite status changes; navigate when LIVE
  const handleInviteUpdate = useCallback(
    (updated: BattleInvite) => {
      if (updated.status === 'LIVE') {
        onGoLive(invite.id);
      }
    },
    [invite.id, onGoLive]
  );

  useEffect(() => {
    const unsubscribe = subscribeToInvite(invite.id, handleInviteUpdate);
    return unsubscribe;
  }, [invite.id, handleInviteUpdate]);

  async function handleCheckIn() {
    setCheckInLoading(true);
    try {
      await onCheckIn(invite.id, role);
      setHasCheckedIn(true);
    } finally {
      setCheckInLoading(false);
    }
  }

  const roleMessage =
    role === 'opponent'
      ? 'Waiting for the Challenger to arrive...'
      : 'Challenge Accepted — waiting for opponent';

  const showCountdown = invite.checkinDeadline !== undefined;
  const expired = showCountdown && timeRemaining === 0;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 bg-white border-b border-gray-200">
        <button
          onClick={onBack}
          aria-label="Go back"
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Waiting Room</h1>
      </div>

      {/* Content */}
      <div className="flex flex-col items-center justify-center flex-1 px-6 gap-6">
        {/* Role message */}
        <p className="text-center text-gray-600 text-base">{roleMessage}</p>

        {/* Challenge name */}
        <div className="w-full max-w-sm rounded-xl bg-white border border-gray-200 shadow-sm p-4 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Challenge</p>
          <p className="text-lg font-semibold text-gray-800">{invite.challenge}</p>
        </div>

        {/* Countdown timer */}
        {showCountdown && (
          <div className="flex flex-col items-center gap-1">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Time remaining</p>
            {expired ? (
              <p className="text-2xl font-bold text-red-500">Time expired</p>
            ) : (
              <p className="text-4xl font-mono font-bold text-gray-900">
                {formatCountdown(timeRemaining)}
              </p>
            )}
          </div>
        )}

        {/* I Am Here CTA */}
        <button
          onClick={handleCheckIn}
          disabled={hasCheckedIn || checkInLoading || expired}
          aria-label="I Am Here"
          className="flex items-center justify-center gap-2 w-full max-w-sm py-4 rounded-xl bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {checkInLoading ? <Spinner /> : null}
          {hasCheckedIn ? 'Checked In ✓' : 'I Am Here'}
        </button>
      </div>
    </div>
  );
}
