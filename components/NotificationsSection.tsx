'use client';

import type { AppNotification } from '../types/index';
import { sortAndGroupNotifications, renderNotificationMessage } from '../lib/battleRequestUtils';

interface NotificationsSectionProps {
  userId: string;
  notifications: AppNotification[];
  onMarkRead: (notificationId: string) => Promise<void>;
  onNotificationTap: (notification: AppNotification) => void;
  onBack: () => void;
}

export default function NotificationsSection({
  userId,
  notifications,
  onMarkRead,
  onNotificationTap,
  onBack,
}: NotificationsSectionProps) {
  void userId;
  const { unread, read } = sortAndGroupNotifications(notifications);
  const isEmpty = unread.length === 0 && read.length === 0;

  async function handleTap(notification: AppNotification) {
    await onMarkRead(notification.id);
    onNotificationTap(notification);
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
        <button
          onClick={onBack}
          className="p-1 rounded-full hover:bg-gray-100"
          aria-label="Go back"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
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
        <h1 className="text-lg font-semibold">Notifications</h1>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 py-16">
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
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <>
            {unread.length > 0 && (
              <section>
                <h2 className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-50">
                  Unread
                </h2>
                <ul>
                  {unread.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onTap={handleTap}
                    />
                  ))}
                </ul>
              </section>
            )}

            {read.length > 0 && (
              <section>
                <h2 className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-50">
                  Read
                </h2>
                <ul>
                  {read.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onTap={handleTap}
                    />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface NotificationItemProps {
  notification: AppNotification;
  onTap: (notification: AppNotification) => Promise<void>;
}

function NotificationItem({ notification, onTap }: NotificationItemProps) {
  const isUnread = !notification.read;

  return (
    <li>
      <button
        onClick={() => onTap(notification)}
        className={`w-full text-left px-4 py-3 border-b border-gray-100 flex items-start gap-3 transition-colors hover:bg-gray-50 active:bg-gray-100 ${
          isUnread ? 'bg-blue-50' : 'bg-white'
        }`}
      >
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm leading-snug ${
              isUnread ? 'font-semibold text-gray-900' : 'font-normal text-gray-600'
            }`}
          >
            {renderNotificationMessage(notification)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatRelativeTime(notification.createdAt)}
          </p>
        </div>
        {isUnread && (
          <span className="mt-1 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" aria-hidden="true" />
        )}
      </button>
    </li>
  );
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
