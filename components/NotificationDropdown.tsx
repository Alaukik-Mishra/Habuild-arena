'use client';

import React, { useState } from 'react';
import type { AppNotification } from '@/types';
import { renderNotificationMessage } from '@/lib/battleRequestUtils';

interface NotificationDropdownProps {
  notifications: AppNotification[];
  onClose: () => void;
  onAccept: (inviteId: string, notificationId: string) => Promise<void>;
  onReject: (inviteId: string, notificationId: string) => Promise<void>;
  onMarkRead: (notificationId: string) => Promise<void>;
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-3 w-3"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export default function NotificationDropdown({
  notifications,
  onClose,
  onAccept,
  onReject,
  onMarkRead,
}: NotificationDropdownProps) {
  // Per-notification submitting state: maps notificationId → 'accept' | 'reject' | null
  const [submitting, setSubmitting] = useState<Record<string, 'accept' | 'reject'>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAccept = async (notif: AppNotification) => {
    if (!notif.inviteId) return;
    // Optimistic update — synchronously disable buttons before any async call
    setSubmitting(prev => ({ ...prev, [notif.id]: 'accept' }));
    setErrors(prev => { const next = { ...prev }; delete next[notif.id]; return next; });
    try {
      await onAccept(notif.inviteId, notif.id);
      // On success: retain disabled state; context will remove/mark-read the notification
    } catch {
      // Roll back on error
      setSubmitting(prev => { const next = { ...prev }; delete next[notif.id]; return next; });
      setErrors(prev => ({ ...prev, [notif.id]: 'Something went wrong. Please try again.' }));
    }
  };

  const handleReject = async (notif: AppNotification) => {
    if (!notif.inviteId) return;
    // Optimistic update — synchronously disable buttons before any async call
    setSubmitting(prev => ({ ...prev, [notif.id]: 'reject' }));
    setErrors(prev => { const next = { ...prev }; delete next[notif.id]; return next; });
    try {
      await onReject(notif.inviteId, notif.id);
    } catch {
      setSubmitting(prev => { const next = { ...prev }; delete next[notif.id]; return next; });
      setErrors(prev => ({ ...prev, [notif.id]: 'Something went wrong. Please try again.' }));
    }
  };

  const unread = notifications.filter(n => !n.read);
  const read = notifications.filter(n => n.read);

  const renderNotif = (notif: AppNotification) => {
    const isSubmitting = !!submitting[notif.id];
    const submittingAction = submitting[notif.id];
    const error = errors[notif.id];
    const isBattleRequest = notif.type === 'battle_request';

    return (
      <div
        key={notif.id}
        className={`px-4 py-3 border-b border-gray-100 last:border-0 ${!notif.read ? 'bg-blue-50/40' : ''}`}
        onClick={() => !notif.read && onMarkRead(notif.id)}
      >
        <div className="flex items-start gap-2">
          {/* Unread dot */}
          {!notif.read && (
            <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" aria-hidden="true" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-800 leading-snug">{renderNotificationMessage(notif)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {new Date(notif.createdAt).toLocaleString([], {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </p>

            {/* Inline Accept / Reject for battle_request notifications */}
            {isBattleRequest && notif.inviteId && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={e => { e.stopPropagation(); handleAccept(notif); }}
                  disabled={isSubmitting}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-bold uppercase tracking-wide disabled:opacity-60 transition-colors hover:bg-indigo-700"
                  aria-label="Accept battle request"
                >
                  {submittingAction === 'accept' ? <Spinner /> : null}
                  Accept
                </button>
                <button
                  onClick={e => { e.stopPropagation(); handleReject(notif); }}
                  disabled={isSubmitting}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-700 text-[11px] font-bold uppercase tracking-wide disabled:opacity-60 transition-colors hover:bg-gray-50"
                  aria-label="Reject battle request"
                >
                  {submittingAction === 'reject' ? <Spinner /> : null}
                  Reject
                </button>
              </div>
            )}

            {error && (
              <p className="text-[10px] text-red-600 mt-1">{error}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="absolute right-0 top-full mt-2 w-80 max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden z-50"
      role="dialog"
      aria-label="Notifications"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-900">Notifications</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 p-1 rounded-full"
          aria-label="Close notifications"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Scrollable list */}
      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 mb-3" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <p className="text-sm text-gray-400 font-medium">No notifications yet</p>
          </div>
        )}

        {unread.length > 0 && (
          <>
            <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">New</p>
            {unread.map(renderNotif)}
          </>
        )}

        {read.length > 0 && (
          <>
            <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Earlier</p>
            {read.map(renderNotif)}
          </>
        )}
      </div>
    </div>
  );
}
