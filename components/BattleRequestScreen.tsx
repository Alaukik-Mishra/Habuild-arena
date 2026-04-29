'use client';

import { useState } from 'react';
import type { BattleInvite } from '../types/index';

interface BattleRequestScreenProps {
  invite: BattleInvite;
  currentUserName: string;
  /** inviteId is passed; the handler in page.tsx also receives the notificationId */
  onAccept: (inviteId: string) => Promise<void>;
  onReject: (inviteId: string) => Promise<void>;
  onBack: () => void;
}

export default function BattleRequestScreen({
  invite,
  onAccept,
  onReject,
  onBack,
}: BattleRequestScreenProps) {
  // isSubmitting tracks which button was tapped — set synchronously before any async call
  const [isSubmitting, setIsSubmitting] = useState<'accept' | 'reject' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(
    invite.status !== 'PENDING' ? 'This request is no longer available' : null
  );

  async function handleAccept() {
    if (isSubmitting !== null) return; // prevent double-tap
    // Optimistic update — synchronous, same event loop tick as the click
    setIsSubmitting('accept');
    setErrorMsg(null);
    try {
      await onAccept(invite.id);
      // On success: retain disabled state; navigation is handled by the parent
    } catch {
      // Roll back on network/server error
      setIsSubmitting(null);
      setErrorMsg('Something went wrong. Please try again.');
    }
  }

  async function handleReject() {
    if (isSubmitting !== null) return;
    setIsSubmitting('reject');
    setErrorMsg(null);
    try {
      await onReject(invite.id);
    } catch {
      setIsSubmitting(null);
      setErrorMsg('Something went wrong. Please try again.');
    }
  }

  const isNotPending = invite.status !== 'PENDING';
  const buttonsDisabled = isSubmitting !== null;

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
        <h1 className="text-lg font-semibold text-gray-900">Battle Request</h1>
      </div>

      {/* Content */}
      <div className="flex flex-col items-center justify-center flex-1 px-6 gap-6">
        {/* Challenger info */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600">
            {invite.from.charAt(0).toUpperCase()}
          </div>
          <p className="text-sm text-gray-500">Challenge from</p>
          <p className="text-xl font-bold text-gray-900">{invite.from}</p>
        </div>

        {/* Challenge name */}
        <div className="w-full max-w-sm rounded-xl bg-white border border-gray-200 shadow-sm p-4 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Challenge</p>
          <p className="text-lg font-semibold text-gray-800">{invite.challenge}</p>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div
            role="alert"
            className="w-full max-w-sm rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 text-center"
          >
            {errorMsg}
          </div>
        )}

        {/* Action buttons — only shown when invite is PENDING and no terminal error */}
        {!isNotPending && !errorMsg && (
          <div className="flex flex-col w-full max-w-sm gap-3">
            <button
              onClick={handleAccept}
              disabled={buttonsDisabled}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-base hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {isSubmitting === 'accept' ? <Spinner /> : null}
              {isSubmitting === 'accept' ? 'Accepting…' : 'Accept'}
            </button>
            <button
              onClick={handleReject}
              disabled={buttonsDisabled}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white border border-gray-300 text-gray-700 font-semibold text-base hover:bg-gray-50 disabled:opacity-60 transition-colors"
            >
              {isSubmitting === 'reject' ? <Spinner /> : null}
              {isSubmitting === 'reject' ? 'Rejecting…' : 'Reject'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
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
