import { Bell, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { DriverDashboard } from "../components/dashboard/DriverDashboard";
import { RiderDashboard } from "../components/dashboard/RiderDashboard";
import { useAuthStore } from "../store/useAuthStore";
import { Avatar } from "../components/ui/Avatar";
import { AIChatWidget } from "../components/AIChatWidget";

export default function Dashboard() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();

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
            <div
              aria-hidden="true"
              className="flex h-12 w-12 items-center justify-center rounded-none border-2 border-black bg-white text-black"
            >
              <Bell size={18} />
            </div>
            <button
              onClick={() => navigate("/profile")}
              aria-label="Open profile settings"
              className="flex h-12 w-12 items-center justify-center rounded-none border-2 border-black bg-white text-black shadow-soft hover:bg-black hover:text-white"
            >
              <Settings size={18} />
            </button>
          </div>
        </header>

        {profile.role === "driver" ? (
          <DriverDashboard />
        ) : (
          <RiderDashboard profile={profile} />
        )}
      </div>
    </div>
  );
}
