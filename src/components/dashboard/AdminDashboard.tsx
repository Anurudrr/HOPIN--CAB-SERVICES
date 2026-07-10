import * as React from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  CircleDollarSign,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getAdminDashboardSnapshot } from "../../lib/platformApi";
import { formatCurrency, formatDateTime } from "../../lib/format";
import type { AdminDashboardData } from "../../types";
import { RatingStars } from "./RatingStars";
import { StatCard } from "./StatCard";

const emptyDashboard: AdminDashboardData = {
  metrics: {
    totalUsers: 0,
    totalProviders: 0,
    totalBookings: 0,
    totalRevenue: 0,
    activeBookings: 0,
    averageRating: 0,
  },
  recentBookings: [],
  services: [],
  providers: [],
  users: [],
  reviews: [],
  transactions: [],
  notifications: [],
};

function groupRevenueByDay(data: AdminDashboardData) {
  const grouped = new Map<string, number>();

  data.transactions.forEach((transaction) => {
    const day = new Date(transaction.created_at).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
    });
    grouped.set(day, (grouped.get(day) ?? 0) + Number(transaction.amount || 0));
  });

  return Array.from(grouped.entries()).map(([day, revenue]) => ({ day, revenue }));
}

function groupBookingsByService(data: AdminDashboardData) {
  const grouped = new Map<string, number>();

  data.recentBookings.forEach((booking) => {
    const label = booking.service?.name || "Unassigned";
    grouped.set(label, (grouped.get(label) ?? 0) + 1);
  });

  return Array.from(grouped.entries()).map(([service, bookings]) => ({ service, bookings }));
}

export function AdminDashboard() {
  const [dashboard, setDashboard] = React.useState<AdminDashboardData>(emptyDashboard);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const snapshot = await getAdminDashboardSnapshot();

        if (active) {
          setDashboard(snapshot);
        }
      } catch (snapshotError) {
        if (active) {
          setError(snapshotError instanceof Error ? snapshotError.message : "Could not load admin analytics.");
          setDashboard(emptyDashboard);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const revenueChart = groupRevenueByDay(dashboard);
  const serviceChart = groupBookingsByService(dashboard);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredUsers = dashboard.users.filter((user) =>
    normalizedQuery
      ? `${user.full_name || ""} ${user.email || ""} ${user.city || ""}`.toLowerCase().includes(normalizedQuery)
      : true,
  );
  const filteredProviders = dashboard.providers.filter((provider) =>
    normalizedQuery
      ? `${provider.profile?.full_name || ""} ${provider.headline || ""} ${provider.profile?.city || ""}`
          .toLowerCase()
          .includes(normalizedQuery)
      : true,
  );
  const filteredReviews = dashboard.reviews.filter((review) =>
    normalizedQuery
      ? `${review.comment || ""} ${review.rating}`.toLowerCase().includes(normalizedQuery)
      : true,
  );
  const activityFeed = [
    ...dashboard.recentBookings.slice(0, 4).map((booking) => ({
      id: booking.id,
      title: `${booking.service?.name || "Booking"} moved to ${booking.status}`,
      detail: `${booking.pickup_address} to ${booking.dest_address}`,
      created_at: booking.created_at,
    })),
    ...dashboard.transactions.slice(0, 4).map((transaction) => ({
      id: transaction.id,
      title: `Payment ${transaction.status}`,
      detail: `${formatCurrency(transaction.amount)} captured`,
      created_at: transaction.created_at,
    })),
    ...dashboard.reviews.slice(0, 4).map((review) => ({
      id: review.id,
      title: `Review received: ${review.rating} stars`,
      detail: review.comment || "Customer left a rating without additional notes.",
      created_at: review.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  if (loading) {
    return (
      <div className="panel flex items-center gap-4 px-6 py-5">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-black border-t-transparent" />
        <p className="text-sm font-medium text-black/60">Loading admin analytics.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="panel-dark grid gap-5 p-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white">
            Admin control room
          </p>
          <h2 className="mt-3 text-4xl font-black uppercase tracking-tighter text-white">
            Platform pulse across users, providers, and live revenue.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white">
            This dashboard runs on real Supabase data so moderation, capacity, and revenue signals
            stay tied to the current production state.
          </p>
        </div>
        <div className="grid gap-3">
          <div className="border-2 border-black bg-white p-4 text-black shadow-soft">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/50">
              Average platform rating
            </p>
            <RatingStars rating={dashboard.metrics.averageRating || 0} className="mt-3" />
          </div>
          <div className="border-2 border-black bg-white p-4 text-black shadow-soft">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/50">
              Active bookings now
            </p>
            <p className="mt-3 text-3xl font-black uppercase tracking-tight text-black">
              {dashboard.metrics.activeBookings}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Users" value={String(dashboard.metrics.totalUsers)} icon={Users} />
        <StatCard label="Providers" value={String(dashboard.metrics.totalProviders)} icon={BriefcaseBusiness} color="bg-white text-black" />
        <StatCard label="Bookings" value={String(dashboard.metrics.totalBookings)} icon={BarChart3} />
        <StatCard label="Revenue" value={formatCurrency(dashboard.metrics.totalRevenue)} icon={CircleDollarSign} color="bg-white text-black" />
      </div>

      {error ? (
        <div className="panel px-5 py-4 text-sm text-black">{error}</div>
      ) : null}

      <div className="panel p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
              Search and filter
            </p>
            <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-black">
              Users, providers, and reviews
            </h3>
          </div>
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/45" size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="field-shell pl-11"
              placeholder="Search by name, email, city, review"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="panel p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
            Revenue trend
          </p>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChart}>
                <CartesianGrid strokeDasharray="4 4" stroke="#00000018" />
                <XAxis dataKey="day" stroke="#000" tickLine={false} axisLine={false} />
                <YAxis stroke="#000" tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#000" fill="#000" fillOpacity={0.12} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
            Booking mix
          </p>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serviceChart}>
                <CartesianGrid strokeDasharray="4 4" stroke="#00000018" />
                <XAxis dataKey="service" stroke="#000" tickLine={false} axisLine={false} />
                <YAxis stroke="#000" tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="bookings" fill="#000000" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="panel p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
                Recent bookings
              </p>
              <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-black">
                Moderation queue
              </h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center border-2 border-black bg-black text-white">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {dashboard.recentBookings.length ? (
              dashboard.recentBookings.map((booking) => (
                <div key={booking.id} className="border-2 border-black bg-gray-100 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.08em] text-black">
                        {booking.service?.name || "Service booking"} / {booking.status}
                      </p>
                      <p className="mt-2 text-sm text-black/60">
                        {booking.pickup_address} to {booking.dest_address}
                      </p>
                    </div>
                    <div className="text-sm text-black/60 md:text-right">
                      <p>{formatCurrency(booking.fare_total)}</p>
                      <p className="mt-1">{formatDateTime(booking.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="border-2 border-black bg-gray-100 p-4 text-sm text-black/60">
                New bookings will appear here once the platform starts receiving live traffic.
              </div>
            )}
          </div>
        </div>

        <div className="panel p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
            Provider health
          </p>
          <div className="mt-5 grid gap-3">
            {filteredProviders.slice(0, 6).map((provider) => (
              <div key={provider.id} className="border-2 border-black bg-gray-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.08em] text-black">
                      {provider.profile?.full_name || "Provider"}
                    </p>
                    <p className="mt-1 text-sm text-black/60">
                      {provider.headline || "Verified provider network"}
                    </p>
                  </div>
                  <span className="route-chip">{provider.availability_status}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-black/60">
                  <span>{provider.completed_bookings} completed</span>
                  <RatingStars rating={provider.rating} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
        <div className="panel p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
            User management
          </p>
          <div className="mt-5 overflow-hidden border-2 border-black">
            {filteredUsers.slice(0, 8).map((user) => (
              <div
                key={user.id}
                className="grid gap-2 border-b border-black/10 bg-white px-4 py-4 text-sm last:border-b-0 md:grid-cols-[1.1fr_0.8fr_0.5fr_0.6fr]"
              >
                <span className="font-black uppercase tracking-[0.08em] text-black">
                  {user.full_name || "Unnamed user"}
                </span>
                <span className="text-black/60">{user.email || "No email"}</span>
                <span className="text-black/60">{user.city || "No city"}</span>
                <span className="text-black/60">{user.role}</span>
              </div>
            ))}
            {!filteredUsers.length ? (
              <div className="bg-gray-100 px-4 py-5 text-sm text-black/60">
                No user records match the current search.
              </div>
            ) : null}
          </div>
        </div>

        <div className="panel p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
            Recent activity feed
          </p>
          <div className="mt-5 grid gap-3">
            {activityFeed.map((item) => (
              <div key={item.id} className="border-2 border-black bg-gray-100 p-4">
                <p className="text-sm font-black uppercase tracking-[0.08em] text-black">
                  {item.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-black/60">{item.detail}</p>
                <p className="mt-3 text-[11px] font-black uppercase tracking-[0.16em] text-black/40">
                  {formatDateTime(item.created_at)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="panel p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
            Provider management
          </p>
          <div className="mt-5 overflow-hidden border-2 border-black">
            {filteredProviders.slice(0, 8).map((provider) => (
              <div
                key={provider.id}
                className="grid gap-2 border-b border-black/10 bg-white px-4 py-4 text-sm last:border-b-0 md:grid-cols-[1fr_0.7fr_0.7fr_0.6fr]"
              >
                <span className="font-black uppercase tracking-[0.08em] text-black">
                  {provider.profile?.full_name || "Provider"}
                </span>
                <span className="text-black/60">{provider.profile?.city || "No city"}</span>
                <span className="text-black/60">{provider.completed_bookings} completed</span>
                <span className="text-black/60">{provider.availability_status}</span>
              </div>
            ))}
            {!filteredProviders.length ? (
              <div className="bg-gray-100 px-4 py-5 text-sm text-black/60">
                No provider records match the current search.
              </div>
            ) : null}
          </div>
        </div>

        <div className="panel p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/60">
            Review moderation
          </p>
          <div className="mt-5 grid gap-3">
            {filteredReviews.slice(0, 6).map((review) => (
              <div key={review.id} className="border-2 border-black bg-gray-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black uppercase tracking-[0.08em] text-black">
                    {review.rating} star review
                  </p>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-black/40">
                    {formatDateTime(review.created_at)}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-black/60">
                  {review.comment || "No written note provided."}
                </p>
              </div>
            ))}
            {!filteredReviews.length ? (
              <div className="border-2 border-black bg-gray-100 p-4 text-sm text-black/60">
                No reviews match the current search.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
