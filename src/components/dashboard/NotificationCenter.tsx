import { BellRing, CheckCheck } from "lucide-react";
import { motion } from "motion/react";

import { formatDateTime } from "../../lib/format";
import type { NotificationItem } from "../../types";
import { Button } from "../ui/Button";

interface NotificationCenterProps {
  notifications: NotificationItem[];
  loading?: boolean;
  onMarkRead: (notificationId: string) => void;
  onMarkAllRead: () => void;
}

export function NotificationCenter({
  notifications,
  loading = false,
  onMarkRead,
  onMarkAllRead,
}: NotificationCenterProps) {
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  return (
    <motion.aside
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      className="panel w-full max-w-md p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
            Notification center
          </p>
          <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-black">
            {unreadCount} unread
          </h3>
        </div>
        <div className="flex h-12 w-12 items-center justify-center border-2 border-black bg-black text-white">
          <BellRing size={18} />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={onMarkAllRead}
          disabled={!notifications.length}
        >
          <CheckCheck size={15} />
          Mark all read
        </Button>
      </div>

      <div className="mt-5 grid gap-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="animate-pulse border-2 border-black bg-gray-100 px-4 py-5">
                <div className="h-3 w-24 bg-black/10" />
                <div className="mt-3 h-4 w-full bg-black/10" />
                <div className="mt-2 h-3 w-32 bg-black/10" />
              </div>
            ))}
          </div>
        ) : notifications.length ? (
          notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => onMarkRead(notification.id)}
              className={`border-2 px-4 py-4 text-left ${
                notification.is_read ? "border-black bg-white" : "border-black bg-gray-100 shadow-soft"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black uppercase tracking-[0.08em] text-black">
                  {notification.title}
                </p>
                {!notification.is_read ? (
                  <span className="route-chip !px-2 !py-1 text-[9px]">New</span>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-6 text-black/60">{notification.body}</p>
              <p className="mt-3 text-[11px] font-black uppercase tracking-[0.16em] text-black/40">
                {formatDateTime(notification.created_at)}
              </p>
            </button>
          ))
        ) : (
          <div className="border-2 border-black bg-gray-100 px-4 py-5 text-sm text-black/60">
            Notifications from booking progress, reviews, payments, and account activity will appear here.
          </div>
        )}
      </div>
    </motion.aside>
  );
}
