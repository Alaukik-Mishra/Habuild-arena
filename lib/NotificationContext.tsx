'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AppNotification } from '@/types';
import { getNotifications, markNotificationRead, markAllNotificationsRead, subscribeToNotifications } from '@/lib/db';

export interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationContextProvider');
  return ctx;
}

interface ProviderProps {
  userId: string | null;
  children: React.ReactNode;
}

export function NotificationContextProvider({ userId, children }: ProviderProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Initial load + Realtime subscription
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }

    // Initial fetch
    getNotifications(userId)
      .then(setNotifications)
      .catch(e => console.error('[NotificationContext] initial fetch error:', e));

    // Realtime subscription — prepend new notifications as they arrive
    const unsub = subscribeToNotifications(userId, (newNotif) => {
      setNotifications(prev => {
        // Avoid duplicates from polling
        if (prev.some(n => n.id === newNotif.id)) return prev;
        return [newNotif, ...prev];
      });
    });

    return unsub;
  }, [userId]);

  // 10-second polling fallback — updates only context state, no layout shifts
  useEffect(() => {
    if (!userId) return;
    const intervalId = setInterval(async () => {
      try {
        const fresh = await getNotifications(userId);
        setNotifications(fresh);
      } catch (e) {
        console.error('[NotificationContext] polling error:', e);
      }
    }, 10_000);
    return () => clearInterval(intervalId);
  }, [userId]);

  const markRead = useCallback(async (notificationId: string) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    try {
      await markNotificationRead(notificationId);
    } catch (e) {
      console.error('[NotificationContext] markRead error:', e);
      // Roll back on failure
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: false } : n)
      );
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await markAllNotificationsRead(userId);
    } catch (e) {
      console.error('[NotificationContext] markAllRead error:', e);
    }
  }, [userId]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, setNotifications, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}
