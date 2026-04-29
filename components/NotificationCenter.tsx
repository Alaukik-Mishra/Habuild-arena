'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useNotifications } from '@/lib/NotificationContext';
import NotificationDropdown from './NotificationDropdown';

interface NotificationCenterProps {
  /** Called when the user taps Accept on a battle_request notification inline. */
  onAccept: (inviteId: string, notificationId: string) => Promise<void>;
  /** Called when the user taps Reject on a battle_request notification inline. */
  onReject: (inviteId: string, notificationId: string) => Promise<void>;
}

export default function NotificationCenter({ onAccept, onReject }: NotificationCenterProps) {
  const { notifications, unreadCount, markRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        {/* Bell icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Red badge — hidden when unreadCount === 0 */}
        {unreadCount > 0 && (
          <span
            className="absolute top-0 right-0 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full"
            aria-hidden="true"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown popover */}
      {isOpen && (
        <NotificationDropdown
          notifications={notifications}
          onClose={() => setIsOpen(false)}
          onAccept={async (inviteId, notificationId) => {
            await onAccept(inviteId, notificationId);
            // Mark the notification read in context after successful action
            await markRead(notificationId);
          }}
          onReject={async (inviteId, notificationId) => {
            await onReject(inviteId, notificationId);
            await markRead(notificationId);
          }}
          onMarkRead={markRead}
        />
      )}
    </div>
  );
}
