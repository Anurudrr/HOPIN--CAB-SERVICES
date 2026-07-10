import * as React from "react";
import { Bell, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../lib/platformApi";
import { normalizeAppRole } from "../lib/roles";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";
import { Avatar } from "../components/ui/Avatar";
import { AIChatWidget } from "../components/AIChatWidget";
import type { NotificationItem } from "../types";

const AdminDashboard = React.lazy(() =>
  import("../components/dashboard/AdminDashboard").then((module) => ({
    default: module.AdminDashboard,
  })),
);
const DriverDashboard = React.lazy(() =>
  import("../components/dashboard/DriverDashboard").then((module) => ({
    default: module.DriverDashboard,
  })),
);
const NotificationCenter = React.lazy(() =>
  import("../components/dashboard/NotificationCenter").then((module) => ({
    default: module.NotificationCenter,
  })),
);
const RiderDashboard = React.lazy(() =>
  import("../components/dashboard/RiderDashboard").then((module) => ({
    default: module.RiderDashboard,
  })),
);

export default function Dashboard() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const role = normalizeAppRole(profile?.role);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!profile?.id) {
      setNotifications([]);
      return;
    }

    let active = true;
    setNotificationsLoading(true);

    void getNotifications(12)
      .then((items) => {
        if (active) {
          setNotifications(items);
        }
      })
      .catch(() => {
        if (active) {
          setNotifications([]);
        }
      })
      .finally(() => {
        if (active) {
          setNotificationsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [profile?.id]);

  React.useEffect(() => {
    if (!profile?.id) {
      return;
    }

    const channel = supabase
      .channel(`dashboard-notifications-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `receiver_id=eq.${profile.id}`,
        },
        async () => {
          const items = await getNotifications(12);
          setNotifications(items);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  if (!profile) {
    return (
      <div className="section-shell flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <div className="panel flex items-center gap-4 px-6 py-5">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-black border-t-transparent" />
          <p className="text-sm font-medium text-black/60">Loading your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="section-shell pt-6">
      <AIChatWidget />
      <div className="section-frame space-y-6">
        <header className="panel flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar
              src={profile.avatar_url}
              name={profile.full_name}
              alt={`${profile.full_name || "HopIn user"} avatar`}
              className="h-14 w-14"
            />
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                Dashboard
              </p>
              <h1 className="mt-1 text-3xl font-black uppercase tracking-tight text-black">
                Welcome back, {profile.full_name || "HopIn user"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setNotificationsOpen((current) => !current)}
              aria-label="Open notifications"
              className="relative flex h-12 w-12 items-center justify-center rounded-none border-2 border-black bg-white text-black shadow-soft hover:bg-black hover:text-white"
            >
              <Bell size={18} />
              {unreadCount ? (
                <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center border-2 border-black bg-black px-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                  {unreadCount}
                </span>
              ) : null}
            </button>
            <button
              onClick={() => navigate("/profile")}
              aria-label="Open profile settings"
              className="flex h-12 w-12 items-center justify-center rounded-none border-2 border-black bg-white text-black shadow-soft hover:bg-black hover:text-white"
            >
              <Settings size={18} />
            </button>
          </div>
        </header>

        {notificationsOpen ? (
          <React.Suspense
            fallback={
              <div className="panel px-6 py-5 text-sm text-black/60">Loading notification center.</div>
            }
          >
            <NotificationCenter
              notifications={notifications}
              loading={notificationsLoading}
              onMarkRead={(notificationId) => {
                void markNotificationRead(notificationId).then(async () => {
                  const items = await getNotifications(12);
                  setNotifications(items);
                });
              }}
              onMarkAllRead={() => {
                void markAllNotificationsRead().then(async () => {
                  const items = await getNotifications(12);
                  setNotifications(items);
                });
              }}
            />
          </React.Suspense>
        ) : null}

        <React.Suspense
          fallback={
            <div className="panel flex items-center gap-4 px-6 py-5">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-black border-t-transparent" />
              <p className="text-sm font-medium text-black/60">Loading dashboard modules.</p>
            </div>
          }
        >
          {role === "admin" ? (
            <AdminDashboard />
          ) : role === "provider" ? (
            <DriverDashboard />
          ) : (
            <RiderDashboard profile={profile} />
          )}
        </React.Suspense>
      </div>
    </div>
  );
}
